from typing import Optional
from pydantic import BaseModel, Field


class IntakeExtractionSchema(BaseModel):
    category: Optional[str] = Field(
        None,
        description="One of: ELECTRICAL, HVAC, NETWORK, PLUMBING, AV_EQUIPMENT, STRUCTURAL_SAFETY"
    )
    extracted_room_or_node_hint: Optional[str] = Field(
        None,
        description="Room code, lab code, floor, or building hint extracted from text"
    )
    extracted_asset_hint: Optional[str] = Field(
        None,
        description="Equipment or asset hint mentioned (e.g., projector, breaker, switch, pipe, AC)"
    )
    reporter_urgency: str = Field(
        default="P2_MEDIUM",
        description="P0_CRITICAL (safety hazard/exam disruption), P1_HIGH, P2_MEDIUM, P3_LOW"
    )
    safety_hazard_detected: bool = Field(
        default=False,
        description="True if sparks, fire, smoke, flooding, live wires, or collapse mentioned"
    )
    concise_summary: str = Field(
        ...,
        description="Factual one-sentence summary of the incident"
    )
    extractor_used: str = Field(
        default="GROQ_LLAMA_3.3_70B",
        description="Identifier of model or fallback parser utilized"
    )

