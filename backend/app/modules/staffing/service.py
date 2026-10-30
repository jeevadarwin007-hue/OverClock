from typing import List, Optional, Tuple
from uuid import UUID
import asyncpg
from app.core.exceptions import ResourceNotFoundError, ConflictError
from app.modules.staffing.schemas import (
    TechnicianScoreBreakdown,
    AssignTechnicianResponse,
    DynamicReassignmentItem,
    ToggleAvailabilityResponse,
)


class StaffingService:

    @staticmethod
    async def score_eligible_technicians(
        conn: asyncpg.Connection,
        category: str,
        target_building: Optional[str] = None,
        exclude_tech_id: Optional[UUID] = None
    ) -> List[TechnicianScoreBreakdown]:
        """
        Executes deterministic technician scoring.
        Applies hard filters: role == TECHNICIAN, is_available == TRUE,
        matching category skill, active shift window @> NOW(), workload < max.
        Applies formula: Score = (Skill * 15.0) + ((1 - load/max) * 25.0) + (Proximity * 15.0).
        """
        query = """
            SELECT u.id, u.full_name, u.email, u.active_workload_count,
                   u.max_concurrent_workload, u.base_building_code,
                   sk.proficiency_level
            FROM users u
            JOIN staff_skills sk ON sk.user_id = u.id AND sk.skill = $1::issue_category
            WHERE u.role = 'TECHNICIAN'
              AND u.is_available = TRUE
              AND u.active_workload_count < u.max_concurrent_workload
              AND EXISTS (
                  SELECT 1 FROM staff_shifts ss
                  WHERE ss.user_id = u.id AND ss.shift_window @> NOW()
              )
        """
        params = [category]
        if exclude_tech_id:
            params.append(exclude_tech_id)
            query += f" AND u.id <> ${len(params)}"

        rows = await conn.fetch(query, *params)
        scored_candidates = []

        for r in rows:
            skill_prof = r["proficiency_level"]
            active_load = r["active_workload_count"]
            max_load = r["max_concurrent_workload"]
            base_bldg = r["base_building_code"]

            skill_score = skill_prof * 15.0
            workload_score = (1.0 - (float(active_load) / float(max_load))) * 25.0
            proximity_bonus = 15.0 if (target_building and base_bldg == target_building) else 0.0
            total_score = skill_score + workload_score + proximity_bonus

            explanation = (
                f"{r['full_name']} (proficiency {skill_prof}/5, workload {active_load}/{max_load}, "
                f"proximity bonus {proximity_bonus:.0f} pts) scored {total_score:.1f}"
            )

            scored_candidates.append(
                TechnicianScoreBreakdown(
                    technician_id=r["id"],
                    full_name=r["full_name"],
                    email=r["email"],
                    skill_proficiency=skill_prof,
                    active_workload=active_load,
                    max_workload=max_load,
                    base_building=base_bldg,
                    proximity_bonus=proximity_bonus,
                    total_score=round(total_score, 2),
                    explanation=explanation
                )
            )

        scored_candidates.sort(key=lambda x: x.total_score, reverse=True)
        return scored_candidates

    @staticmethod
    async def assign_technician(
        conn: asyncpg.Connection,
        work_order_id: UUID,
        technician_id: Optional[UUID] = None,
        actor_id: Optional[UUID] = None
    ) -> AssignTechnicianResponse:
        """
        Assigns or reassigns a technician to a work order.
        If technician_id is omitted, selects the highest-scoring eligible technician.
        """
        # 1. Fetch work order details
        wo = await conn.fetchrow(
            """
            SELECT wo.id, wo.category, wo.state, wo.assigned_tech_id,
                   wo.target_node_id, cn.building_code
            FROM work_orders wo
            LEFT JOIN campus_nodes cn ON wo.target_node_id = cn.id
            WHERE wo.id = $1
            FOR UPDATE OF wo;
            """,
            work_order_id
        )
        if not wo:
            raise ResourceNotFoundError("Work Order", work_order_id)

        category = wo["category"]
        if not category:
            raise ConflictError("Work order must have a categorized domain before technician assignment.")

        target_building = wo["building_code"]
        previous_tech_id = wo["assigned_tech_id"]

        selected_tech = None
        score = 0.0
        explanation = ""

        if technician_id is not None:
            # Manual assignment validation: check eligibility and active shift
            tech_check = await conn.fetchrow(
                """
                SELECT u.id, u.full_name, u.email, u.is_available, u.active_workload_count,
                       u.max_concurrent_workload, u.base_building_code,
                       sk.proficiency_level,
                       EXISTS (
                           SELECT 1 FROM staff_shifts ss
                           WHERE ss.user_id = u.id AND ss.shift_window @> NOW()
                       ) AS on_shift
                FROM users u
                LEFT JOIN staff_skills sk ON sk.user_id = u.id AND sk.skill = $2::issue_category
                WHERE u.id = $1 AND u.role = 'TECHNICIAN';
                """,
                technician_id,
                category
            )
            if not tech_check:
                raise ResourceNotFoundError("Technician", technician_id)

            if not tech_check["is_available"]:
                raise ConflictError(f"Technician {tech_check['full_name']} is currently marked unavailable.")

            if not tech_check["on_shift"]:
                raise ConflictError(f"Technician {tech_check['full_name']} is outside active shift hours.")

            if tech_check["proficiency_level"] is None:
                raise ConflictError(f"Technician {tech_check['full_name']} does not have required skill for {category}.")

            if tech_check["active_workload_count"] >= tech_check["max_concurrent_workload"]:
                raise ConflictError(f"Technician {tech_check['full_name']} has reached max concurrent workload capacity.")

            selected_tech = tech_check
            score = 100.0
            explanation = f"Direct assignment by authorized manager: {tech_check['full_name']} verified on shift with skill {category}."

        else:
            # Deterministic Auto-Assignment
            candidates = await StaffingService.score_eligible_technicians(
                conn, category=category, target_building=target_building
            )
            if not candidates:
                raise ConflictError(f"No eligible technician currently available on shift for category '{category}'.")

            top_candidate = candidates[0]
            selected_tech = {
                "id": top_candidate.technician_id,
                "full_name": top_candidate.full_name,
                "email": top_candidate.email
            }
            score = top_candidate.total_score
            explanation = top_candidate.explanation

        new_tech_id = selected_tech["id"]

        # 2. Update workload counts
        if previous_tech_id and previous_tech_id != new_tech_id:
            await conn.execute(
                """
                UPDATE users
                SET active_workload_count = GREATEST(0, active_workload_count - 1)
                WHERE id = $1;
                """,
                previous_tech_id
            )

        if previous_tech_id != new_tech_id:
            await conn.execute(
                """
                UPDATE users
                SET active_workload_count = active_workload_count + 1
                WHERE id = $1;
                """,
                new_tech_id
            )

        # 3. Update work order state and technician
        new_state = "ASSIGNED" if wo["state"] in ("INGESTED", "TRIAGED") else wo["state"]
        await conn.execute(
            """
            UPDATE work_orders
            SET assigned_tech_id = $2,
                state = $3,
                updated_at = NOW()
            WHERE id = $1;
            """,
            work_order_id,
            new_tech_id,
            new_state
        )

        # 4. Audit Log
        actor = actor_id or new_tech_id
        await conn.execute(
            """
            INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
            VALUES ($1, $2, 'TECHNICIAN_ASSIGNED', $3, $4, $5::jsonb);
            """,
            work_order_id,
            actor,
            wo["state"],
            new_state,
            f'{{"assigned_tech_id": "{new_tech_id}", "tech_name": "{selected_tech["full_name"]}", "score": {score}, "explanation": "{explanation}"}}'
        )

        # 5. Outbound notification to the technician
        await conn.execute(
            """
            INSERT INTO outbound_notifications (recipient_user_id, recipient_email, subject, body, work_order_id)
            VALUES ($1, $2, $3, $4, $5);
            """,
            new_tech_id,
            selected_tech["email"],
            f"Work Order Assigned: {category} Incident",
            f"You have been assigned to work order {work_order_id}. Explanation: {explanation}",
            work_order_id
        )

        return AssignTechnicianResponse(
            work_order_id=work_order_id,
            assigned_tech_id=new_tech_id,
            assigned_tech_name=selected_tech["full_name"],
            assigned_tech_email=selected_tech["email"],
            score=score,
            explanation=explanation,
            work_order_state=new_state
        )

    @staticmethod
    async def toggle_availability(
        conn: asyncpg.Connection,
        technician_id: UUID,
        is_available: bool,
        reason: Optional[str] = None,
        actor_id: Optional[UUID] = None
    ) -> ToggleAvailabilityResponse:
        """
        Toggles technician availability.
        When is_available is toggled to FALSE, automatically finds all active assigned tickets
        and triggers Dynamic Reassignment with the 3-reassignment anti-flap escalation guard.
        """
        tech = await conn.fetchrow(
            "SELECT id, full_name, email, role FROM users WHERE id = $1 FOR UPDATE;", technician_id
        )
        if not tech or tech["role"] != "TECHNICIAN":
            raise ResourceNotFoundError("Technician", technician_id)

        await conn.execute(
            "UPDATE users SET is_available = $2 WHERE id = $1;", technician_id, is_available
        )

        reassignments: List[DynamicReassignmentItem] = []

        if not is_available:
            # Find open work orders assigned to this technician
            open_wos = await conn.fetch(
                """
                SELECT wo.id, wo.ticket_number, wo.category, wo.reassignment_count,
                       wo.state, cn.building_code
                FROM work_orders wo
                LEFT JOIN campus_nodes cn ON wo.target_node_id = cn.id
                WHERE wo.assigned_tech_id = $1
                  AND wo.state IN ('ASSIGNED', 'IN_PROGRESS', 'BLOCKED_PARTS')
                ORDER BY wo.created_at ASC
                FOR UPDATE OF wo;
                """,
                technician_id
            )

            for r in open_wos:
                wo_id = r["id"]
                t_num = r["ticket_number"]
                cat = r["category"]
                bldg = r["building_code"]
                reassign_count = r["reassignment_count"]

                # ANTI-FLAP GUARD: If already reassigned 3 or more times, escalate to admin
                if reassign_count >= 3:
                    # Transition to TRIAGED and clear assigned tech
                    await conn.execute(
                        """
                        UPDATE work_orders
                        SET assigned_tech_id = NULL,
                            state = 'TRIAGED',
                            updated_at = NOW()
                        WHERE id = $1;
                        """,
                        wo_id
                    )
                    # Decrement old tech load
                    await conn.execute(
                        """
                        UPDATE users
                        SET active_workload_count = GREATEST(0, active_workload_count - 1)
                        WHERE id = $1;
                        """,
                        technician_id
                    )
                    # Notify admin
                    admin_id = await conn.fetchval(
                        "SELECT id FROM users WHERE role = 'FACILITIES_ADMIN' LIMIT 1;"
                    )
                    admin_email = await conn.fetchval(
                        "SELECT email FROM users WHERE id = $1;", admin_id
                    )
                    await conn.execute(
                        """
                        INSERT INTO outbound_notifications (recipient_user_id, recipient_email, subject, body, work_order_id)
                        VALUES ($1, $2, $3, $4, $5);
                        """,
                        admin_id,
                        admin_email or "admin@easwari.edu",
                        f"ESCALATION: Ticket #{t_num} Flapping Guard Triggered",
                        f"Work order #{t_num} reached max reassignment limit ({reassign_count} hops). Technician {tech['full_name']} became unavailable. Reverted to TRIAGED for manual dispatch.",
                        wo_id
                    )
                    # Audit log
                    await conn.execute(
                        """
                        INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
                        VALUES ($1, $2, 'ANTI_FLAP_ESCALATION', $3, 'TRIAGED', $4::jsonb);
                        """,
                        wo_id,
                        actor_id or technician_id,
                        r["state"],
                        f'{{"reason": "Anti-flap guard triggered (hops={reassign_count})"}}'
                    )

                    reassignments.append(
                        DynamicReassignmentItem(
                            work_order_id=wo_id,
                            ticket_number=t_num,
                            previous_tech_id=technician_id,
                            new_tech_id=None,
                            new_tech_name=None,
                            reassignment_count=reassign_count,
                            escalated_to_admin=True,
                            reason=f"Anti-flap guard triggered: reassignment limit ({reassign_count}) reached."
                        )
                    )
                else:
                    # Score remaining available technicians
                    candidates = await StaffingService.score_eligible_technicians(
                        conn, category=cat, target_building=bldg, exclude_tech_id=technician_id
                    )

                    if candidates:
                        next_tech = candidates[0]
                        # Transfer assignment
                        await conn.execute(
                            """
                            UPDATE work_orders
                            SET assigned_tech_id = $2,
                                reassignment_count = reassignment_count + 1,
                                updated_at = NOW()
                            WHERE id = $1;
                            """,
                            wo_id,
                            next_tech.technician_id
                        )
                        # Decrement old tech, increment new tech
                        await conn.execute(
                            """
                            UPDATE users
                            SET active_workload_count = GREATEST(0, active_workload_count - 1)
                            WHERE id = $1;
                            """,
                            technician_id
                        )
                        await conn.execute(
                            """
                            UPDATE users
                            SET active_workload_count = active_workload_count + 1
                            WHERE id = $1;
                            """,
                            next_tech.technician_id
                        )

                        # Audit log
                        await conn.execute(
                            """
                            INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
                            VALUES ($1, $2, 'DYNAMIC_REASSIGNMENT', $3, $3, $4::jsonb);
                            """,
                            wo_id,
                            actor_id or technician_id,
                            r["state"],
                            f'{{"from_tech": "{tech["full_name"]}", "to_tech": "{next_tech.full_name}", "reassignment_count": {reassign_count + 1}}}'
                        )

                        # Outbox notification to new technician
                        await conn.execute(
                            """
                            INSERT INTO outbound_notifications (recipient_user_id, recipient_email, subject, body, work_order_id)
                            VALUES ($1, $2, $3, $4, $5);
                            """,
                            next_tech.technician_id,
                            next_tech.email,
                            f"Reassigned Ticket #{t_num}",
                            f"Work order #{t_num} has been dynamically reassigned to you. Previous technician unavailable.",
                            wo_id
                        )

                        reassignments.append(
                            DynamicReassignmentItem(
                                work_order_id=wo_id,
                                ticket_number=t_num,
                                previous_tech_id=technician_id,
                                new_tech_id=next_tech.technician_id,
                                new_tech_name=next_tech.full_name,
                                reassignment_count=reassign_count + 1,
                                escalated_to_admin=False,
                                reason=f"Dynamic handoff: {tech['full_name']} unavailable -> dispatched {next_tech.full_name}"
                            )
                        )
                    else:
                        # No alternate technicians on shift: escalate to TRIAGED
                        await conn.execute(
                            """
                            UPDATE work_orders
                            SET assigned_tech_id = NULL,
                                state = 'TRIAGED',
                                reassignment_count = reassignment_count + 1,
                                updated_at = NOW()
                            WHERE id = $1;
                            """,
                            wo_id
                        )
                        await conn.execute(
                            """
                            UPDATE users
                            SET active_workload_count = GREATEST(0, active_workload_count - 1)
                            WHERE id = $1;
                            """,
                            technician_id
                        )
                        reassignments.append(
                            DynamicReassignmentItem(
                                work_order_id=wo_id,
                                ticket_number=t_num,
                                previous_tech_id=technician_id,
                                new_tech_id=None,
                                new_tech_name=None,
                                reassignment_count=reassign_count + 1,
                                escalated_to_admin=True,
                                reason="No alternative technicians currently available on shift."
                            )
                        )

        return ToggleAvailabilityResponse(
            technician_id=technician_id,
            is_available=is_available,
            affected_work_orders_count=len(reassignments),
            reassignments=reassignments
        )

