import json
from uuid import UUID, uuid4
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any
import asyncpg
from app.core.exceptions import (
    ResourceNotFoundError,
    ConflictError,
    FSMTransitionError,
    AuthorizationError,
)
from app.modules.work_orders.schemas import (
    CreateWorkOrderRequest,
    TransitionWorkOrderRequest,
    WorkOrderOut,
    WorkOrderPartItem,
    WorkOrderTransitionResponse,
)


class WorkOrderService:

    @staticmethod
    async def create_work_order(
        conn: asyncpg.Connection,
        request: CreateWorkOrderRequest,
        reporter_id: UUID,
        actor_role: str,
        department_id: Optional[UUID] = None
    ) -> WorkOrderOut:
        thread_id = request.conversation_thread_id or f"thread-{uuid4().hex[:12]}"
        initial_state = request.initial_state.upper()

        if initial_state not in ("INGESTED", "TRIAGED"):
            raise ConflictError("Initial work order state must be either 'INGESTED' or 'TRIAGED'")

        # Infer department from target node if not provided
        target_dept_id = department_id
        if request.target_node_id and not target_dept_id:
            node_bldg = await conn.fetchval(
                "SELECT building_code FROM campus_nodes WHERE id = $1;", request.target_node_id
            )
            if node_bldg == "EEC-ACAD":
                target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-CSE-IT';")
            elif node_bldg == "EEC-MECH-PG":
                target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-MECH-CIVIL';")
            elif node_bldg == "EEC-ROBOTICS":
                target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-ROBOTICS';")
            else:
                target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-ADMIN';")

        row = await conn.fetchrow(
            """
            INSERT INTO work_orders (
                conversation_thread_id, reporter_user_id, target_node_id,
                category, reporter_urgency, calculated_priority, state,
                raw_description, ai_summary, department_id
            )
            VALUES ($1, $2, $3, $4::issue_category, $5::priority_level, $5::priority_level, $6::wo_state, $7, $8, $9)
            RETURNING id, ticket_number, conversation_thread_id, reporter_user_id,
                      target_node_id, category, reporter_urgency, calculated_priority,
                      impact_score, state, raw_description, ai_summary, assigned_tech_id,
                      department_id, estimated_cost, estimated_duration_mins,
                      reassignment_count, correlator_reporter_count, sla_is_paused,
                      sla_breached, blocked_reason, created_at, updated_at, resolved_at;
            """,
            thread_id,
            reporter_id,
            request.target_node_id,
            request.category,
            request.reporter_urgency,
            initial_state,
            request.raw_description,
            request.ai_summary,
            target_dept_id
        )

        wo_id = row["id"]

        # Audit log creation
        await conn.execute(
            """
            INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
            VALUES ($1, $2, 'WORK_ORDER_CREATED', NULL, $3, $4::jsonb);
            """,
            wo_id,
            reporter_id,
            initial_state,
            json.dumps({"description": request.raw_description, "ticket_number": row["ticket_number"]})
        )

        return await WorkOrderService.get_work_order(conn, wo_id)

    @staticmethod
    async def get_work_order(conn: asyncpg.Connection, work_order_id: UUID) -> WorkOrderOut:
        row = await conn.fetchrow(
            """
            SELECT wo.id, wo.ticket_number, wo.conversation_thread_id, wo.reporter_user_id,
                   wo.target_node_id, cn.node_code, cn.name AS node_name,
                   COALESCE(wo.room_code, cn.node_code) AS room_code,
                   COALESCE(wo.floor_number, cn.floor_number) AS floor_number,
                   cn.building_code,
                   wo.parent_master_wo_id, wo.category, wo.reporter_urgency,
                   wo.calculated_priority, wo.impact_score, wo.state, wo.raw_description,
                   wo.ai_summary, wo.assigned_tech_id, u.full_name AS assigned_tech_name,
                   u.email AS assigned_tech_email,
                   sk.skill::text AS assigned_tech_role,
                   wo.department_id, wo.estimated_cost, wo.estimated_duration_mins,
                   wo.reassignment_count, wo.correlator_reporter_count, wo.sla_is_paused,
                   wo.sla_breached, wo.blocked_reason, wo.created_at, wo.updated_at, wo.resolved_at
            FROM work_orders wo
            LEFT JOIN campus_nodes cn ON wo.target_node_id = cn.id
            LEFT JOIN users u ON wo.assigned_tech_id = u.id
            LEFT JOIN LATERAL (
                SELECT skill FROM staff_skills WHERE user_id = u.id LIMIT 1
            ) sk ON true
            WHERE wo.id = $1;
            """,
            work_order_id
        )
        if not row:
            raise ResourceNotFoundError("Work Order", work_order_id)

        # Fetch part reservations
        part_rows = await conn.fetch(
            """
            SELECT pr.part_id, p.sku, p.name, pr.requested_qty, pr.locked_unit_cost, pr.status
            FROM part_reservations pr
            JOIN inventory_parts p ON pr.part_id = p.id
            WHERE pr.work_order_id = $1
            ORDER BY p.sku ASC;
            """,
            work_order_id
        )
        parts = [
            WorkOrderPartItem(
                part_id=pr["part_id"],
                sku=pr["sku"],
                name=pr["name"],
                requested_qty=pr["requested_qty"],
                locked_unit_cost=pr["locked_unit_cost"],
                status=pr["status"]
            )
            for pr in part_rows
        ]

        return WorkOrderOut(
            id=row["id"],
            ticket_number=row["ticket_number"],
            conversation_thread_id=row["conversation_thread_id"],
            reporter_user_id=row["reporter_user_id"],
            target_node_id=row["target_node_id"],
            node_code=row["node_code"],
            node_name=row["node_name"],
            room_code=row["room_code"],
            floor_number=row["floor_number"],
            building_code=row["building_code"],
            parent_master_wo_id=row["parent_master_wo_id"],
            category=row["category"],
            reporter_urgency=row["reporter_urgency"],
            calculated_priority=row["calculated_priority"],
            impact_score=row["impact_score"],
            state=row["state"],
            raw_description=row["raw_description"],
            ai_summary=row["ai_summary"],
            assigned_tech_id=row["assigned_tech_id"],
            assigned_tech_name=row["assigned_tech_name"],
            assigned_tech_email=row["assigned_tech_email"],
            assigned_tech_role=row["assigned_tech_role"],
            department_id=row["department_id"],
            estimated_cost=row["estimated_cost"],
            estimated_duration_mins=row["estimated_duration_mins"],
            reassignment_count=row["reassignment_count"],
            correlator_reporter_count=row["correlator_reporter_count"],
            sla_is_paused=row["sla_is_paused"],
            sla_breached=row["sla_breached"],
            blocked_reason=row["blocked_reason"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            resolved_at=row["resolved_at"],
            reserved_parts=parts
        )

    @staticmethod
    async def list_work_orders(
        conn: asyncpg.Connection,
        state: Optional[str] = None,
        category: Optional[str] = None,
        assigned_tech_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[WorkOrderOut]:
        query = """
            SELECT id FROM work_orders
            WHERE 1=1
        """
        params = []
        if state:
            params.append(state)
            query += f" AND state = ${len(params)}::wo_state"
        if category:
            params.append(category)
            query += f" AND category = ${len(params)}::issue_category"
        if assigned_tech_id:
            params.append(assigned_tech_id)
            query += f" AND assigned_tech_id = ${len(params)}"

        query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1) + " OFFSET $" + str(len(params) + 2)
        params.extend([limit, offset])

        ids = await conn.fetch(query, *params)
        return [await WorkOrderService.get_work_order(conn, r["id"]) for r in ids]

    @staticmethod
    async def transition_work_order(
        conn: asyncpg.Connection,
        work_order_id: UUID,
        request: TransitionWorkOrderRequest,
        actor_id: UUID,
        actor_role: str
    ) -> WorkOrderTransitionResponse:
        """
        Executes a deterministic state transition adhering to fsm_state_transitions matrix.
        Enforces operational guards for IN_PROGRESS and RESOLVED.
        """
        target_state = request.target_state.upper()

        wo = await conn.fetchrow(
            """
            SELECT id, ticket_number, state, assigned_tech_id, estimated_cost, department_id
            FROM work_orders
            WHERE id = $1
            FOR UPDATE;
            """,
            work_order_id
        )
        if not wo:
            raise ResourceNotFoundError("Work Order", work_order_id)

        from_state = wo["state"]
        if from_state == target_state:
            return WorkOrderTransitionResponse(
                work_order_id=wo["id"],
                ticket_number=wo["ticket_number"],
                previous_state=from_state,
                new_state=target_state,
                transitioned_by=actor_id,
                actor_role=actor_role,
                reason="State unchanged",
                timestamp=datetime.now(timezone.utc)
            )

        # 1. Operational Guard: IN_PROGRESS transition checks
        if target_state == "IN_PROGRESS":
            # Guard A: Verify actor is the assigned technician or an administrator
            if actor_role == "TECHNICIAN" and wo["assigned_tech_id"] != actor_id:
                raise AuthorizationError("Only the technician assigned to this work order may mark it IN_PROGRESS.")

            # Guard B: Starting work on repairs exceeding Rs. 5,000 requires active APPROVED approval matching snapshot
            if wo["estimated_cost"] > Decimal("5000.00"):
                canonical_hash = await conn.fetchval(
                    "SELECT fn_compute_canonical_wo_snapshot($1::uuid);", work_order_id
                )
                approved_record = await conn.fetchrow(
                    """
                    SELECT id FROM approvals
                    WHERE work_order_id = $1 
                      AND status = 'APPROVED'
                      AND snapshot_hash = $2;
                    """,
                    work_order_id,
                    canonical_hash
                )
                if not approved_record:
                    raise ConflictError(
                        f"Work order estimated cost (Rs. {wo['estimated_cost']:,.2f}) exceeds Rs. 5,000 threshold. "
                        "An active APPROVED approval record matching the canonical snapshot hash is required before starting work."
                    )

        # 2. Operational Guard: RESOLVED transition checks
        if target_state == "RESOLVED":
            if not request.resolution_notes:
                request.resolution_notes = "Problem inspected and confirmed resolved by Admin."

            # Convert all RESERVED parts to CONSUMED via inventory_movements
            reservations = await conn.fetch(
                """
                SELECT part_id, requested_qty
                FROM part_reservations
                WHERE work_order_id = $1 AND status = 'RESERVED'
                FOR UPDATE;
                """,
                work_order_id
            )
            for res in reservations:
                p_id = res["part_id"]
                qty = res["requested_qty"]

                # Ledger movement: delta_physical = -qty, delta_available = 0, delta_reserved = -qty
                await conn.execute(
                    """
                    INSERT INTO inventory_movements (
                        part_id, work_order_id, actor_id, movement_type,
                        delta_physical, delta_available, delta_reserved
                    )
                    VALUES ($1, $2, $3, 'CONSUME', $4, 0, $4);
                    """,
                    p_id,
                    work_order_id,
                    actor_id,
                    -qty
                )

                # Update balance on inventory_parts
                await conn.execute(
                    """
                    UPDATE inventory_parts
                    SET physical_on_hand_qty = physical_on_hand_qty - $2,
                        reserved_qty = reserved_qty - $2
                    WHERE id = $1;
                    """,
                    p_id,
                    qty
                )

                # Update reservation status to CONSUMED
                await conn.execute(
                    """
                    UPDATE part_reservations
                    SET status = 'CONSUMED'
                    WHERE work_order_id = $1 AND part_id = $2;
                    """,
                    work_order_id,
                    p_id
                )

            # Decrement technician active workload count
            if wo["assigned_tech_id"]:
                await conn.execute(
                    """
                    UPDATE users
                    SET active_workload_count = GREATEST(0, active_workload_count - 1)
                    WHERE id = $1;
                    """,
                    wo["assigned_tech_id"]
                )

        # 3. Execute the state change (The PostgreSQL DB trigger trg_work_order_fsm_enforcement enforces allowed_roles)
        assigned_during_transition = False
        if target_state == "ASSIGNED" and not wo["assigned_tech_id"]:
            # Assignment itself selects only a matching eligible technician and performs
            # the guarded state transition atomically. If nobody is eligible, it raises
            # before changing the work order instead of assigning an arbitrary worker.
            from app.modules.staffing.service import StaffingService
            assignment_result = await StaffingService.assign_technician(
                conn,
                work_order_id=work_order_id,
                actor_id=actor_id,
            )
            assigned_during_transition = assignment_result.work_order_state == target_state

        resolved_sql = ", resolved_at = NOW()" if target_state == "RESOLVED" else ""
        if not assigned_during_transition:
            await conn.execute(
                f"""
                UPDATE work_orders
                SET state = $2::wo_state,
                    updated_at = NOW()
                    {resolved_sql}
                WHERE id = $1;
                """,
                work_order_id,
                target_state
            )

        now = datetime.now(timezone.utc)

        # 5. Record in audit_logs
        audit_details = {
            "reason": request.reason,
            "resolution_notes": request.resolution_notes,
            "extra": request.details or {}
        }
        await conn.execute(
            """
            INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
            VALUES ($1, $2, 'FSM_TRANSITION', $3, $4, $5::jsonb);
            """,
            work_order_id,
            actor_id,
            from_state,
            target_state,
            json.dumps(audit_details)
        )

        return WorkOrderTransitionResponse(
            work_order_id=wo["id"],
            ticket_number=wo["ticket_number"],
            previous_state=from_state,
            new_state=target_state,
            transitioned_by=actor_id,
            actor_role=actor_role,
            reason=request.reason,
            timestamp=now
        )

    @staticmethod
    async def approve_work_order(
        conn: asyncpg.Connection,
        work_order_id: UUID,
        actor_id: UUID,
        actor_role: str,
    ) -> WorkOrderOut:
        """
        Approves an incident/problem so it proceeds to execution (ASSIGNED).
        Dispatches technician and notifies via Groq email.
        """
        if actor_role not in ("SYS_ADMIN", "FACILITIES_ADMIN", "DEPT_MANAGER", "CAMPUS_DEAN"):
            raise AuthorizationError("Only administrators or department managers can approve work orders.")

        req = TransitionWorkOrderRequest(
            target_state="ASSIGNED",
            reason="Admin approved work order for execution"
        )
        await WorkOrderService.transition_work_order(
            conn, work_order_id=work_order_id, request=req, actor_id=actor_id, actor_role=actor_role
        )
        return await WorkOrderService.get_work_order(conn, work_order_id)

    @staticmethod
    async def resolve_work_order(
        conn: asyncpg.Connection,
        work_order_id: UUID,
        actor_id: UUID,
        actor_role: str,
        resolution_notes: Optional[str] = None,
    ) -> WorkOrderOut:
        """
        Admin resolution: marks the work order as RESOLVED.
        """
        if actor_role not in ("SYS_ADMIN", "FACILITIES_ADMIN", "TECHNICIAN", "CAMPUS_DEAN"):
            raise AuthorizationError("Only administrators or assigned technicians can mark work orders resolved.")

        req = TransitionWorkOrderRequest(
            target_state="RESOLVED",
            reason="Admin verified problem resolution",
            resolution_notes=resolution_notes or "Problem inspected and confirmed resolved by Admin."
        )
        await WorkOrderService.transition_work_order(
            conn, work_order_id=work_order_id, request=req, actor_id=actor_id, actor_role=actor_role
        )
        return await WorkOrderService.get_work_order(conn, work_order_id)
