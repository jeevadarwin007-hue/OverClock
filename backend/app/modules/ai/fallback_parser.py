import re
from typing import Optional, Tuple
from app.modules.ai.schemas import IntakeExtractionSchema


def extract_deterministic_fallback(text: str) -> IntakeExtractionSchema:
    """
    High-speed deterministic regex and keyword fallback parser.
    Executes in < 1ms with zero external network dependencies.
    """
    text_clean = text.strip()
    text_lower = text_clean.lower()

    # 1. Quick check for greetings / non-problem conversational remarks
    GREETINGS = {
        "hi", "hello", "hello s", "hey", "hola", "namaste", "good morning", 
        "good afternoon", "good evening", "how are you", "what is this", 
        "testing", "test", "thanks", "thank you", "bye", "ok", "okay", 
        "sup", "whats up", "what's up", "who are you"
    }
    stripped_punct = re.sub(r"[^\w\s]", "", text_lower).strip()
    if stripped_punct in GREETINGS or len(stripped_punct) < 4:
        return IntakeExtractionSchema(
            is_problem=False,
            decision="REPLY_QUESTION",
            reply_message="Hello! What campus facility or equipment issue can we assist you with today? Please describe the problem and location.",
            category=None,
            extracted_room_or_node_hint=None,
            extracted_asset_hint=None,
            reporter_urgency="P3_LOW",
            safety_hazard_detected=False,
            concise_summary="User greeting or conversational text.",
            extractor_used="DETERMINISTIC_FALLBACK"
        )

    # 2. Exact node / room code regex pattern
    node_pattern = r"\b(RM-[A-Z0-9-]+|LAB-[A-Z0-9-]+|EEC-[A-Z0-9-]+|SUBSTATION-[A-Z0-9-]+|PANEL-[A-Z0-9-]+|SW-[A-Z0-9-]+|AHU-[A-Z0-9-]+)\b"
    node_match = re.search(node_pattern, text, re.IGNORECASE)
    room_hint: Optional[str] = None
    if node_match:
        room_hint = node_match.group(1).upper()
    else:
        # Check floor hints: e.g. "3rd floor lab", "2nd floor classroom"
        floor_match = re.search(r"\b(1st|2nd|3rd|4th|5th|ground)\s+floor(?:\s+([a-zA-Z0-9_-]+))?\b", text, re.IGNORECASE)
        if floor_match:
            room_hint = floor_match.group(0).strip()
        else:
            # Check building hints
            bldg_match = re.search(r"\b(Main\s+Admin|Admin|Academic|Mechanical|Robotics|Auditorium|Food\s+Court)\s*(?:Block|Building)?\b", text, re.IGNORECASE)
            if bldg_match:
                room_hint = bldg_match.group(0).strip()

    # 3. Asset hints
    asset_keywords = {
        "projector": ["projector", "projection", "smart board", "display"],
        "breaker": ["mccb", "mcb", "circuit breaker", "breaker", "fuse", "panel"],
        "switch": ["network switch", "poe switch", "core switch", "ethernet switch"],
        "access point": ["wi-fi router", "access point", "ap", "wifi router"],
        "air conditioner": ["ac", "air conditioner", "ahu", "split ac"],
        "pipe": ["water pipe", "drainage", "tap", "faucet", "valve"],
        "light": ["tube light", "led panel", "bulb", "lighting"],
    }
    extracted_asset = None
    for asset, keywords in asset_keywords.items():
        if any(kw in text_lower for kw in keywords):
            extracted_asset = asset
            break

    # 4. Category inference via keyword dictionaries
    category_scores = {
        "ELECTRICAL": ["spark", "sparking", "electrical", "blackout", "power", "breaker", "mcb", "mccb", "voltage", "wire", "shock", "tripping", "short circuit"],
        "HVAC": ["ac", "air conditioner", "cooling", "ahu", "chiller", "refrigerant", "compressor", "ventilation", "heating"],
        "NETWORK": ["wifi", "wi-fi", "internet", "lan", "ethernet", "network", "packet loss", "ping", "router", "switch", "offline"],
        "PLUMBING": ["pipe", "leak", "leakage", "water", "washroom", "toilet", "tap", "faucet", "drainage", "flooding", "sewage", "basin"],
        "AV_EQUIPMENT": ["projector", "smart board", "audio", "mic", "microphone", "speaker", "hdmi", "display", "screen", "amplifier"],
        "STRUCTURAL_SAFETY": ["crack", "ceiling", "wall", "broken", "railing", "glass", "door lock", "structural"],
    }

    matched_category = None
    max_matches = 0
    for cat, kws in category_scores.items():
        count = sum(1 for kw in kws if re.search(r"\b" + re.escape(kw) + r"\b", text_lower))
        if count > max_matches:
            max_matches = count
            matched_category = cat

    # General fault indicators
    fault_keywords = ["broken", "damage", "fault", "not working", "failure", "burst", "bursting", "overflow", "stuck", "crack", "sparks", "fire", "smoke"]
    has_fault_word = any(fw in text_lower for fw in fault_keywords)

    # 5. Safety Hazard Detection
    hazard_keywords = ["spark", "sparking", "fire", "smoke", "burning smell", "live wire", "shock", "flooding", "collapse", "explosion"]
    safety_hazard = any(hk in text_lower for hk in hazard_keywords)

    # If NO category matches, NO fault word, NO asset, and NO safety hazard -> NOT A PROBLEM
    if max_matches == 0 and not has_fault_word and not safety_hazard and not extracted_asset:
        return IntakeExtractionSchema(
            is_problem=False,
            decision="REPLY_QUESTION",
            reply_message="Could you describe the specific campus maintenance fault, equipment breakdown, or room needing repairs?",
            category=None,
            extracted_room_or_node_hint=room_hint,
            extracted_asset_hint=None,
            reporter_urgency="P3_LOW",
            safety_hazard_detected=False,
            concise_summary="Non-incident query or conversational text.",
            extractor_used="DETERMINISTIC_FALLBACK"
        )

    # 6. Urgency Calculation
    has_exam = "exam" in text_lower or "examination" in text_lower or "test" in text_lower
    if safety_hazard:
        urgency = "P0_CRITICAL"
    elif has_exam:
        urgency = "P0_CRITICAL" if max_matches > 0 else "P1_HIGH"
    elif "urgent" in text_lower or "immediately" in text_lower or "emergency" in text_lower or "critical" in text_lower:
        urgency = "P1_HIGH"
    else:
        urgency = "P2_MEDIUM"

    # 7. Concise Summary
    summary = text.strip()
    if len(summary) > 120:
        summary = summary[:117] + "..."

    return IntakeExtractionSchema(
        is_problem=True,
        decision="ADD_TICKET",
        reply_message=None,
        category=matched_category or "ELECTRICAL",
        extracted_room_or_node_hint=room_hint,
        extracted_asset_hint=extracted_asset,
        reporter_urgency=urgency,
        safety_hazard_detected=safety_hazard,
        concise_summary=summary,
        extractor_used="DETERMINISTIC_FALLBACK"
    )
