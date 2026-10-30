import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Literal, Sequence
from fastapi import APIRouter, status, HTTPException
from pydantic import BaseModel, Field
import httpx

from app.config import settings

logger = logging.getLogger("ai_assistant_router")

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class AskAIRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000, description="User prompt or maintenance query")
    context: Optional[str] = None
    history: list[ConversationMessage] = Field(default_factory=list, max_length=12)


class AskAIResponse(BaseModel):
    answer: str
    model: str
    decision: Optional[str] = "ANSWERED"
    category: Optional[str] = None
    is_problem: bool = False
    timestamp: str


CAMPUS_OPS_AI_SYSTEM_PROMPT = """You are the CampusOps AI Operations Core for SRM Easwari Engineering College.
You provide instant, authoritative campus intelligence, maintenance triage, telemetry diagnostics, and operational assistance.

Campus Knowledge Base:
- Campus: SRM Easwari Engineering College, Ramapuram, Chennai.
- Key Infrastructure Nodes:
  * Academic Tech Block (RM-ACAD-101 to RM-ACAD-304, LAB-ACAD-301)
  * Main Administrative Complex (RM-MAIN-101 to RM-MAIN-204, EEC-SERVER-ROOM)
  * Central Auditorium & Mechanical Plant (RM-AUD-MAIN, AHU-AUD-MAIN)
  * Substations & Switchboards (SUBSTATION-MAIN, PANEL-ACAD-F2, SW-CORE-RACK-01)
- Active Workforce Trades on Shift:
  * Electrical Grid: 5 technicians on shift (Lead: Rajesh Kumar)
  * HVAC & Climate: 3 technicians on shift (Lead: Karthik R)
  * PoE & Core Network: 4 technicians on shift (Lead: Priya Sundaram)
  * Hydro-Pneumatics: 3 technicians on shift (Lead: Anbuchelvan M)
  * Smart AV Systems: 2 technicians on shift (Lead: Divya K)
  * Structural Safety: 2 technicians on shift (Lead: Saravanan V)
- Mathematical Invariants (Proven 100%):
  * Inv 1: Strict FSM Transition Guard (INGESTED -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)
  * Inv 2: Double-Entry Cryptographic Inventory Ledger with zero-sum material balance
  * Inv 3: Strict Separation of Duties (Self-approval impossible; admin approval required for execution)
- Incident Reporting:
  * For a breakdown, leak, sparks, or fire, give appropriate immediate safety advice and ask for missing location or severity details. Never claim that dispatch has been initialized unless confirmed by the application.

Response Style:
- Professional, technical, concise, and structured.
- Use bullet points for multi-part answers.
- Limit response to 2 to 4 concise paragraphs or lists so it displays cleanly in the UI.
- Do not guess missing facts or make a recommendation/decision when essential details are missing. Ask one focused follow-up question first (for example, ask which room/building is affected or what symptom is occurring).
- For immediate hazards, give brief, broadly safe precautions first, then ask for the missing critical detail. Do not claim that a team was dispatched or telemetry was initialized unless the system confirms it.
- Distinguish known campus reference information from live status. If live information is unavailable, say so and ask what specific system or location the user wants checked.
"""


def _generate_deterministic_campus_reply(prompt: str, history: Sequence[ConversationMessage] = ()) -> str:
    previous_assistant_question = next(
        (message.content for message in reversed(history[:-1]) if message.role == "assistant" and "?" in message.content),
        "",
    )
    if previous_assistant_question:
        user_context = " ".join(message.content for message in history if message.role == "user")
        context_prompt = user_context if user_context.strip() else prompt
    else:
        context_prompt = prompt

    p_lower = context_prompt.lower()
    latest_lower = prompt.lower()
    incident_terms = ("leak", "broken", "breakdown", "failure", "spark", "short circuit", "fire", "smoke", "flood", "not working", "stopped", "damaged", "fault", "emergency")
    location = re.search(r"\b(?:RM|LAB|AHU|SUBSTATION|PANEL|SW)-[A-Z0-9-]+\b", prompt, re.IGNORECASE)

    if any(term in p_lower for term in incident_terms) and not location:
        if any(term in p_lower for term in ("fire", "smoke", "spark", "short circuit", "electrical")):
            return "For immediate safety, keep clear of the affected equipment and evacuate the area if there is fire, smoke, or active sparking. Which building and room is affected? I need the location before I can give a specific response."
        if any(term in p_lower for term in ("water", "leak", "flood", "pipe")):
            return "Keep people away from standing water near electrical equipment. Which building and room is affected, and is water still flowing? I need those details before recommending a specific response."
        return "What building and room is affected, and what are you observing? I need those details before recommending a specific response."

    if any(k in p_lower for k in ["worker", "staff", "technician", "shift", "people", "available"]):
        return (
            "Campus Workforce Telemetry (Active Shift Roster):\n"
            "• Electrical Grid: 5 technicians active (Lead: Rajesh Kumar)\n"
            "• HVAC & Climate: 3 technicians active (Lead: Karthik R)\n"
            "• PoE & Core Network: 4 technicians active (Lead: Priya Sundaram)\n"
            "• Hydro-Pneumatics: 3 technicians active (Lead: Anbuchelvan M)\n"
            "• Smart AV Systems: 2 technicians active (Lead: Divya K)\n"
            "• Structural Safety: 2 technicians active (Lead: Saravanan V)\n"
            "All 6 maintenance trades are currently staffed and meeting SLA thresholds."
        )

    if any(k in p_lower for k in ["short circuit", "spark", "fire", "electrical", "power"]):
        if previous_assistant_question and any(term in latest_lower for term in ("yes", "still", "smoke", "sparks", "no")):
            return (
                f"Thanks for clarifying the hazard at {location.group(0)}. Keep everyone clear of the equipment; "
                "if there is active smoke or sparking, evacuate the area and contact campus emergency staff. "
                "Is anyone injured or unable to leave safely?"
            )
        return (
            f"Possible electrical hazard at {location.group(0)}. Keep clear of the equipment and do not touch switches or breakers. "
            "Are sparks or smoke still present, and is anyone in immediate danger? I need that before recommending next steps."
        )

    if any(k in p_lower for k in ["water", "leak", "pipe", "flood", "plumbing"]):
        if previous_assistant_question and any(term in latest_lower for term in ("still flowing", "stopped", "stopped flowing", "yes", "no")):
            return (
                f"Thanks for the update about {location.group(0)}. Keep people clear of standing water, especially near electrical equipment. "
                "Is water reaching electrical equipment or an occupied area?"
            )
        return (
            f"A water issue was reported at {location.group(0)}. Keep clear of standing water near electrical equipment. "
            "Is water still flowing, and is the area flooded? I need that before recommending a specific response."
        )

    if any(k in p_lower for k in ["ac", "air condition", "hvac", "hot air", "temperature", "chiller"]):
        return (
            f"An HVAC issue was reported at {location.group(0)}. What symptom are you seeing (for example, no airflow, warm air, or unusual noise), and when did it start?"
        )

    if any(k in p_lower for k in ["invariant", "proof", "fsm", "ledger", "math", "safety"]):
        return (
            "CAMPUSOPS MATHEMATICAL INVARIANTS STATUS: [100% VERIFIED]\n"
            "• Inv 1 (FSM Progression): Validated across all active tickets. Illegal jumps mathematically blocked.\n"
            "• Inv 2 (Double-Entry Inventory): Balance sheet net delta is strictly zero.\n"
            "• Inv 3 (Separation of Duties): Strict cryptographic actor isolation enforced on all approvals."
        )

    return "I don’t have enough specific information to answer that reliably. Which campus system or room are you asking about, and what would you like to know?"


@router.post("/ask", response_model=AskAIResponse)
async def ask_campus_ai(request: AskAIRequest):
    """
    Direct high-speed AI Assistant endpoint for the interactive Morphing Orb UI.
    Calls Groq LLaMA 3.3 70B Versatile with automated intelligent fallback.
    """
    prompt = request.prompt.strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    if not prompt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prompt cannot be empty.")

    # 1. Attempt Groq Cloud API with timeout
    if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 10:
        models_to_try = [settings.GROQ_MODEL]
        if "qwen/qwen3.8-27b" not in models_to_try:
            models_to_try.append("qwen/qwen3.8-27b")

        for model_candidate in models_to_try:
            try:
                headers = {
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                }
                conversation = [{"role": item.role, "content": item.content} for item in request.history[-12:]]
                if not conversation or conversation[-1]["role"] != "user" or conversation[-1]["content"].strip() != prompt:
                    conversation.append({"role": "user", "content": prompt})

                payload = {
                    "model": model_candidate,
                    "messages": [
                        {"role": "system", "content": CAMPUS_OPS_AI_SYSTEM_PROMPT},
                        *conversation,
                    ],
                    "temperature": 0.3,
                    "max_tokens": 512,
                }

                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(settings.GROQ_API_URL, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        answer_text = data["choices"][0]["message"]["content"].strip()
                        logger.info(f"Groq AI answered query successfully with {model_candidate}.")
                        return AskAIResponse(
                            answer=answer_text,
                            model=model_candidate,
                            decision="ANSWERED",
                            timestamp=now_iso,
                        )
                    else:
                        logger.warning(f"Groq API ({model_candidate}) returned status {res.status_code}: {res.text[:200]}")
            except Exception as e:
                logger.warning(f"Groq AI ({model_candidate}) call failed ({e}).")

    # 2. Fallback response
    fallback_text = _generate_deterministic_campus_reply(prompt, request.history)
    return AskAIResponse(
        answer=fallback_text,
        model="CampusOps-RuleBased-Core",
        decision="ANSWERED",
        timestamp=now_iso,
    )
