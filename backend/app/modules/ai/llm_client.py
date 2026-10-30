import json
import asyncio
import logging
from typing import Optional
import httpx
from app.config import settings
from app.modules.ai.schemas import IntakeExtractionSchema
from app.modules.ai.fallback_parser import extract_deterministic_fallback

logger = logging.getLogger("groq_ai_client")

EXTRACTION_SYSTEM_PROMPT = """You are the AI Incident Intelligence & Triage Agent for SRM Easwari Engineering College CampusOps.
Your task is to analyze user text and determine whether it describes a genuine campus physical facility / maintenance / equipment problem to register, OR if it requires replying with a question.

DECISION INSTRUCTIONS:
1. "is_problem": boolean
   - true: The user is reporting a real physical facility maintenance issue, breakdown, failure, or safety hazard (e.g. electrical short circuit, power outage, sparks, AC hot air/leak, water pipe burst, clogged drain, broken door/window, Wi-Fi down, network switch failure, projector not displaying, fire hazard, structural damage).
   - false: The input is a greeting ("hello", "hello s", "hi", "hey"), chit-chat ("how are you", "what's up"), generic remark ("test", "ok", "asdf"), academic query, or describes NO physical facility malfunction.

2. "decision": string
   - "ADD_TICKET": When "is_problem" is true AND there is a physical problem to be resolved by facility workers.
   - "REPLY_QUESTION": When "is_problem" is false OR there is no clear maintenance problem described.

3. "reply_message": string or null
   - When "decision" is "REPLY_QUESTION": Provide a polite, direct question asking the user what campus facility or equipment issue they need help with, or asking for the specific room and problem.
     * For "hello" or "hello s": "Hello! What campus facility or equipment problem can we assist you with today? Please describe the issue and location."
     * For vague phrases: "Could you specify what equipment or facility is broken and in which room or block?"
   - When "decision" is "ADD_TICKET": null.

Return ONLY a valid JSON object with the following fields:
- "is_problem": boolean
- "decision": "ADD_TICKET" or "REPLY_QUESTION"
- "reply_message": string or null
- "category": One of "ELECTRICAL", "HVAC", "NETWORK", "PLUMBING", "AV_EQUIPMENT", "STRUCTURAL_SAFETY", or null
- "extracted_room_or_node_hint": Room code (e.g. "RM-ACAD-204", "LAB-ACAD-301"), floor hint (e.g. "3rd floor lab"), or building name if mentioned, else null
- "extracted_asset_hint": Specific equipment mentioned (e.g. "projector", "breaker", "switch", "AC unit", "water pipe"), else null
- "reporter_urgency": One of "P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW"
- "safety_hazard_detected": boolean (true if sparks, fire, smoke, water flooding, live electrical wires, or structural collapse are mentioned)
- "concise_summary": A factual, objective 1-sentence summary of what broke and where, or a brief summary of user intent if not an incident

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
            {"role": "user", "content": f"User Input:\n{text}"}
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
        is_prob = bool(parsed.get("is_problem", True))
        decision = parsed.get("decision", "ADD_TICKET" if is_prob else "REPLY_QUESTION")
        reply_msg = parsed.get("reply_message")

        return IntakeExtractionSchema(
            is_problem=is_prob,
            decision=decision,
            reply_message=reply_msg,
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
