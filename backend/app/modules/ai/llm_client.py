import json
import asyncio
import logging
from typing import Optional
import httpx
from app.config import settings
from app.modules.ai.schemas import IntakeExtractionSchema
from app.modules.ai.fallback_parser import extract_deterministic_fallback

logger = logging.getLogger("groq_ai_client")

EXTRACTION_SYSTEM_PROMPT = """You are the AI Incident Intelligence parser for SRM Easwari Engineering College CampusOps.
Your task is to analyze user incident descriptions, chat complaints, or emails, and extract structured entity slots.

Return ONLY a valid JSON object with the following fields:
- "category": One of "ELECTRICAL", "HVAC", "NETWORK", "PLUMBING", "AV_EQUIPMENT", "STRUCTURAL_SAFETY", or null if unclear.
- "extracted_room_or_node_hint": Room code (e.g. "RM-ACAD-204", "LAB-ACAD-301"), floor hint (e.g. "3rd floor lab"), or building name if mentioned, else null.
- "extracted_asset_hint": Specific equipment mentioned (e.g. "projector", "breaker", "switch", "AC unit", "water pipe"), else null.
- "reporter_urgency": One of "P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW". Set P0_CRITICAL if safety hazard or ongoing exam disruption is mentioned.
- "safety_hazard_detected": boolean (true if sparks, fire, smoke, water flooding, live electrical wires, or structural collapse are mentioned).
- "concise_summary": A factual, objective 1-sentence summary of what broke and where.

DO NOT invent room numbers, assets, or details not present in the input text."""


def parsed_json_urgency(val: Optional[str]) -> str:
    if val in ("P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW"):
        return val
    return "P2_MEDIUM"


async def _call_groq_model(client: httpx.AsyncClient, model: str, text: str, headers: dict) -> Optional[IntakeExtractionSchema]:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Incident Report:\n{text}"}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 512,
    }
    response = await client.post(settings.GROQ_API_URL, json=payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return IntakeExtractionSchema(
            category=parsed.get("category"),
            extracted_room_or_node_hint=parsed.get("extracted_room_or_node_hint"),
            extracted_asset_hint=parsed.get("extracted_asset_hint"),
            reporter_urgency=parsed_json_urgency(parsed.get("reporter_urgency")),
            safety_hazard_detected=bool(parsed.get("safety_hazard_detected", False)),
            concise_summary=parsed.get("concise_summary") or text[:120],
            extractor_used=f"GROQ_{model}"
        )
    return None


async def extract_incident_entities(
    text: str,
    force_fallback: bool = False
) -> IntakeExtractionSchema:
    """
    Extracts entities using Groq Cloud API with strict 2.5s timeout.
    On timeout, rate limit (429), or error, automatically delegates to the deterministic regex fallback parser.
    """
    if force_fallback or not settings.GROQ_API_KEY:
        return extract_deterministic_fallback(text)

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    # Attempt primary model (llama-3.3-70b-versatile), then active fallback model if 404
    candidate_models = [settings.GROQ_MODEL]
    if "openai/gpt-oss-120b" not in candidate_models:
        candidate_models.append("openai/gpt-oss-120b")

    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            for model in candidate_models:
                try:
                    result = await asyncio.wait_for(
                        _call_groq_model(client, model, text, headers),
                        timeout=settings.LLM_TIMEOUT_SECONDS
                    )
                    if result:
                        return result
                except (httpx.HTTPStatusError, httpx.RequestError):
                    continue
                except (asyncio.TimeoutError, httpx.TimeoutException):
                    break
    except Exception as e:
        logger.warning(f"Groq API call encountered exception: {e}. Falling back to regex parser.")

    return extract_deterministic_fallback(text)
