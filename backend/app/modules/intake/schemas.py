from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class InboundIntakeRequest(BaseModel):
    text: str = Field(..., min_length=3)
    conversation_thread_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    channel: str = Field(default="PORTAL_FORM")  # PORTAL_FORM, CHAT, SIMULATED_EMAIL_WEBHOOK


class ClarificationReplyRequest(BaseModel):
    reply_text: str = Field(..., min_length=1)


class EmailWebhookRequest(BaseModel):
    event_id: str
    sender: str
    subject: str
    body: str
    received_at: Optional[str] = None


class IntakeResponse(BaseModel):
    work_order_id: UUID
    ticket_number: int
    conversation_thread_id: str
    state: str
    category: Optional[str]
    target_node_code: Optional[str]
    target_node_name: Optional[str]
    clarification_needed: bool
    clarification_question: Optional[str]
    partial_slots: Dict[str, Any]
    correlation_action: str
    concise_summary: str
    extractor_used: str
    created_at: datetime

