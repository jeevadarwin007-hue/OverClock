from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class TechnicianScoreBreakdown(BaseModel):
    technician_id: UUID
    full_name: str
    email: str
    skill_proficiency: int
    active_workload: int
    max_workload: int
    base_building: Optional[str] = None
    proximity_bonus: float
    total_score: float
    explanation: str


class AssignTechnicianRequest(BaseModel):
    technician_id: Optional[UUID] = None  # None for auto-assignment via scoring


class AssignTechnicianResponse(BaseModel):
    work_order_id: UUID
    assigned_tech_id: UUID
    assigned_tech_name: str
    assigned_tech_email: str
    score: float
    explanation: str
    work_order_state: str


class ToggleAvailabilityRequest(BaseModel):
    is_available: bool
    reason: Optional[str] = None


class DynamicReassignmentItem(BaseModel):
    work_order_id: UUID
    ticket_number: int
    previous_tech_id: UUID
    new_tech_id: Optional[UUID]
    new_tech_name: Optional[str]
    reassignment_count: int
    escalated_to_admin: bool
    reason: str


class ToggleAvailabilityResponse(BaseModel):
    technician_id: UUID
    is_available: bool
    affected_work_orders_count: int
    reassignments: List[DynamicReassignmentItem]

