import re
import json
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
import asyncpg
from app.core.exceptions import ResourceNotFoundError, ConflictError
from app.modules.ai.llm_client import extract_incident_entities
from app.modules.ai.agents import InstructionAgent, AntiHallucinationAgent
from app.modules.correlation.service import CorrelationService
from app.modules.staffing.service import StaffingService
from app.modules.integrations.idempotency import claim_idempotency_key, complete_idempotency_key
from app.modules.intake.schemas import InboundIntakeRequest, IntakeResponse


class IntakeService:

    @staticmethod
    async def resolve_campus_node(
        conn: asyncpg.Connection,
        hint: Optional[str],
        raw_text: Optional[str] = None
    ) -> Tuple[Optional[dict], List[dict], bool]:
        """
        Resolves an extracted room or location hint against campus_nodes.
        Returns:
            (resolved_node, candidate_nodes, is_ambiguous)
        """
        target_text = f"{hint or ''} {raw_text or ''}".strip()
        if not target_text:
            return None, [], False

        # 1. Exact node_code match if hint is provided
        if hint:
            hint_clean = hint.strip().upper()
            exact = await conn.fetchrow(
                """
                SELECT id, node_code, name, building_code, floor_number, node_type
                FROM campus_nodes
                WHERE UPPER(node_code) = $1;
                """,
                hint_clean
            )
            if exact:
                return dict(exact), [], False

        # 2. Check if a known node_code is embedded in hint or raw_text
        embedded_match = re.search(
            r"\b(RM-[A-Z0-9-]+|LAB-[A-Z0-9-]+|EEC-[A-Z0-9-]+|SUBSTATION-[A-Z0-9-]+|PANEL-[A-Z0-9-]+|SW-[A-Z0-9-]+|AHU-[A-Z0-9-]+)\b",
            target_text,
            re.IGNORECASE
        )
        if embedded_match:
            embedded_code = embedded_match.group(1).upper()
            found = await conn.fetchrow(
                "SELECT id, node_code, name, building_code, floor_number, node_type FROM campus_nodes WHERE UPPER(node_code) = $1;",
                embedded_code
            )
            if found:
                return dict(found), [], False

        # 3. Check for specific room numbers (e.g. "room 204", "rm 204", "204", "lab 301")
        room_num_match = re.search(
            r"\b(?:RM|LAB|ROOM|HALL|CLASSROOM)?\s*[:#\-]?\s*([1-9][0-9]{2})\b",
            target_text,
            re.IGNORECASE
        )
        if room_num_match:
            num = room_num_match.group(1)
            num_matches = await conn.fetch(
                """
                SELECT id, node_code, name, building_code, floor_number, node_type
                FROM campus_nodes
                WHERE node_code LIKE '%-' || $1
                ORDER BY node_code ASC;
                """,
                num
            )
            if len(num_matches) == 1:
                return dict(num_matches[0]), [], False
            elif len(num_matches) > 1:
                t_lower = target_text.lower()
                filtered = []
                for m in num_matches:
                    b = m["building_code"].lower()
                    if ("acad" in t_lower or "cse" in t_lower or "it" in t_lower) and "acad" in b:
                        filtered.append(m)
                    elif ("mech" in t_lower or "civil" in t_lower or "library" in t_lower) and "mech" in b:
                        filtered.append(m)
                    elif ("admin" in t_lower or "main" in t_lower) and "main" in b:
                        filtered.append(m)
                    elif ("rob" in t_lower or "abb" in t_lower) and "rob" in b:
                        filtered.append(m)
                    elif ("aud" in t_lower or "food" in t_lower) and "aud" in b:
                        filtered.append(m)
                if len(filtered) == 1:
                    return dict(filtered[0]), [], False
                elif len(filtered) > 1:
                    return None, [dict(c) for c in filtered], True
                return None, [dict(c) for c in num_matches], True

        # 4. Check floor hints: e.g. "3rd floor lab"
        hint_lower = target_text.lower()
        floor_num = None
        if "4th floor" in hint_lower or "floor 4" in hint_lower or "fourth floor" in hint_lower:
            floor_num = 4
        elif "3rd floor" in hint_lower or "floor 3" in hint_lower or "third floor" in hint_lower:
            floor_num = 3
        elif "2nd floor" in hint_lower or "floor 2" in hint_lower or "second floor" in hint_lower:
            floor_num = 2
        elif "1st floor" in hint_lower or "floor 1" in hint_lower or "first floor" in hint_lower:
            floor_num = 1
        elif "ground floor" in hint_lower or "floor 0" in hint_lower:
            floor_num = 1

        if floor_num is not None:
            type_filter = "LAB%" if "lab" in hint_lower else "RM%"
            candidates = await conn.fetch(
                """
                SELECT id, node_code, name, building_code, floor_number, node_type
                FROM campus_nodes
                WHERE floor_number = $1 AND node_code LIKE $2
                ORDER BY node_code ASC;
                """,
                floor_num,
                type_filter
            )
            if len(candidates) > 1:
                return None, [dict(c) for c in candidates], True
            elif len(candidates) == 1:
                return dict(candidates[0]), [], False

        # 5. Partial name match
        name_match = await conn.fetch(
            """
            SELECT id, node_code, name, building_code, floor_number, node_type
            FROM campus_nodes
            WHERE name ILIKE '%' || $1 || '%'
            LIMIT 5;
            """,
            hint or target_text
        )
        if len(name_match) == 1:
            return dict(name_match[0]), [], False
        elif len(name_match) > 1:
            return None, [dict(c) for c in name_match], True

        return None, [], False

    @staticmethod
    async def process_intake(
        conn: asyncpg.Connection,
        request: InboundIntakeRequest,
        reporter_id: UUID,
        actor_role: str,
        force_fallback: bool = False
    ) -> IntakeResponse:
        """
        Executes the 4-phase incident intake pipeline:
        Phase 1: Atomic idempotency claim.
        Phase 2: Lock-free NLP extraction via Groq / fallback.
        Phase 3: Location resolution & clarification detection.
        Phase 4: Atomic DB commit & outbox notification.
        """
        # Phase 1: Idempotency Claim
        if request.idempotency_key:
            is_new, cached = await claim_idempotency_key(
                conn,
                source=request.channel,
                idempotency_key=request.idempotency_key,
                payload=request.dict()
            )
            if not is_new and cached:
                cached_data = cached["data"]
                if isinstance(cached_data, str):
                    cached_data = json.loads(cached_data)
                return IntakeResponse(**cached_data)

        # Phase 2: Lock-Free NLP Entity Extraction
        extraction = await extract_incident_entities(request.text, force_fallback=force_fallback)

        thread_id = request.conversation_thread_id or f"thread-{uuid4().hex[:12]}"

        # Groq Triage Decision: Check if input is a real problem or should reply with a question
        if not extraction.is_problem or extraction.decision == "REPLY_QUESTION":
            reply_q = extraction.reply_message or (
                "Hello! Could you please describe the specific campus maintenance fault, equipment breakdown, or room needing repairs?"
            )
            return IntakeResponse(
                is_ticket_created=False,
                decision="REPLY_QUESTION",
                reply_message=reply_q,
                work_order_id=None,
                ticket_number=None,
                conversation_thread_id=thread_id,
                state="AWAITING_INCIDENT",
                category=None,
                target_node_code=None,
                target_node_name=None,
                clarification_needed=True,
                clarification_question=reply_q,
                partial_slots={},
                correlation_action="NONE",
                concise_summary=extraction.concise_summary or "Non-incident query or conversational text.",
                extractor_used=extraction.extractor_used,
                emergency_instructions=None,
                created_at=datetime.now(timezone.utc)
            )

        # Phase 3: Location Resolution & Room Validation
        node, candidates, is_ambiguous = await IntakeService.resolve_campus_node(
            conn, extraction.extracted_room_or_node_hint, raw_text=request.text
        )

        category = extraction.category or "ELECTRICAL"
        urgency = extraction.reporter_urgency

        # If location is ambiguous between multiple valid rooms
        if is_ambiguous:
            cand_codes = [c["node_code"] for c in candidates]
            reply_msg = f"Multiple rooms match: {', '.join(cand_codes)}. Please specify which exact room or lab you are reporting from."
            return IntakeResponse(
                is_ticket_created=False,
                decision="REPLY_QUESTION",
                reply_message=reply_msg,
                work_order_id=None,
                ticket_number=None,
                conversation_thread_id=thread_id,
                state="AWAITING_INCIDENT",
                category=category,
                target_node_code=None,
                target_node_name=None,
                room_code=None,
                floor_number=None,
                assigned_tech_name=None,
                assigned_tech_email=None,
                assigned_tech_role=None,
                email_dispatched=False,
                clarification_needed=True,
                clarification_question=reply_msg,
                partial_slots={"candidate_rooms": cand_codes, "category": category},
                correlation_action="NONE",
                concise_summary=extraction.concise_summary or "Ambiguous room specified.",
                extractor_used=extraction.extractor_used,
                emergency_instructions=None,
                created_at=datetime.now(timezone.utc)
            )

        # If room is NOT specified or does NOT exist on campus -> Reject and ask for valid room
        if not node:
            room_hint_str = extraction.extracted_room_or_node_hint
            if room_hint_str:
                reply_msg = f"There is no room available in that name ('{room_hint_str}') on campus. Please specify a valid room number (e.g. RM-ACAD-204, LAB-ACAD-301) and floor."
            else:
                reply_msg = "There is no room available in that name. Please specify the room number (e.g. RM-ACAD-204, LAB-ACAD-301) and floor."

            return IntakeResponse(
                is_ticket_created=False,
                decision="REPLY_QUESTION",
                reply_message=reply_msg,
                work_order_id=None,
                ticket_number=None,
                conversation_thread_id=thread_id,
                state="AWAITING_INCIDENT",
                category=category,
                target_node_code=None,
                target_node_name=None,
                room_code=None,
                floor_number=None,
                assigned_tech_name=None,
                assigned_tech_email=None,
                assigned_tech_role=None,
                email_dispatched=False,
                clarification_needed=True,
                clarification_question=reply_msg,
                partial_slots={"room_hint": room_hint_str, "category": category},
                correlation_action="NONE",
                concise_summary=extraction.concise_summary or "No valid room specified on campus.",
                extractor_used=extraction.extractor_used,
                emergency_instructions=None,
                created_at=datetime.now(timezone.utc)
            )

        partial_slots = {
            "room_hint": extraction.extracted_room_or_node_hint,
            "room_code": node["node_code"],
            "floor_number": node["floor_number"],
            "building_code": node["building_code"],
            "asset_hint": extraction.extracted_asset_hint,
            "category": category,
            "safety_hazard": extraction.safety_hazard_detected,
        }

        # Department mapping
        target_node_id = node["id"]
        target_dept_id = None
        bldg = node["building_code"]
        if bldg == "EEC-ACAD":
            target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-CSE-IT';")
        elif bldg == "EEC-MECH-PG":
            target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-MECH-CIVIL';")
        elif bldg == "EEC-ROBOTICS":
            target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-ROBOTICS';")
        else:
            target_dept_id = await conn.fetchval("SELECT id FROM departments WHERE code = 'DEPT-ADMIN';")

        # Multi-Agent Emergency & Instruction Safety Pipeline
        emergency_instructions = None
        is_emergency = InstructionAgent.is_emergency_incident(request.text) or extraction.safety_hazard_detected
        if is_emergency:
            urgency = "P0_CRITICAL"
            b_code = node["building_code"]
            r_code = node["node_code"]
            raw_instructions = await InstructionAgent.generate_safety_instructions(
                raw_description=request.text,
                detected_building=b_code,
                detected_room=r_code
            )
            grounded_instructions = await AntiHallucinationAgent.verify_and_ground_emergency(raw_instructions)
            emergency_instructions = grounded_instructions.model_dump()
            partial_slots["emergency_instructions"] = emergency_instructions

        wo_state = "TRIAGED"

        # Phase 4: Atomic Operational Commit
        row = await conn.fetchrow(
            """
            INSERT INTO work_orders (
                conversation_thread_id, reporter_user_id, target_node_id,
                room_code, floor_number,
                category, reporter_urgency, calculated_priority, state,
                raw_description, ai_summary, partial_slots, clarification_question,
                department_id
            )
            VALUES ($1, $2, $3, $4, $5, $6::issue_category, $7::priority_level, $7::priority_level,
                    $8::wo_state, $9, $10, $11::jsonb, $12, $13)
            RETURNING id, ticket_number, created_at;
            """,
            thread_id,
            reporter_id,
            target_node_id,
            node["node_code"],
            node["floor_number"],
            category,
            urgency,
            wo_state,
            request.text,
            extraction.concise_summary,
            json.dumps(partial_slots),
            None,
            target_dept_id
        )

        wo_id = row["id"]
        ticket_num = row["ticket_number"]
        created_at = row["created_at"]

        # Audit Record
        await conn.execute(
            """
            INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
            VALUES ($1, $2, 'INTAKE_PROCESSED', NULL, $3, $4::jsonb);
            """,
            wo_id,
            reporter_id,
            wo_state,
            json.dumps({
                "extractor_used": extraction.extractor_used,
                "room_code": node["node_code"],
                "floor_number": node["floor_number"],
                "channel": request.channel
            })
        )

        # Correlation execution
        correlation_action = "NONE"
        correl_res = await CorrelationService.correlate_incident(
            conn,
            work_order_id=wo_id,
            target_node_id=target_node_id,
            category=category,
            actor_id=reporter_id
        )
        correlation_action = correl_res.get("action", "NONE")
        if correlation_action == "MERGED_DUPLICATE":
            wo_state = "MERGED_DUPLICATE"

        # Recommend only a worker with the matching trade skill and an active shift.
        recommended_worker = None
        assigned_worker_res = None
        requires_admin_approval = urgency in ("P0_CRITICAL", "P1_HIGH")
        dispatch_note = None
        worker_candidates = []
        worker_lookup_failed = False
        if wo_state != "MERGED_DUPLICATE":
            try:
                worker_candidates = await StaffingService.score_eligible_technicians(
                    conn,
                    category=category,
                    target_building=node["building_code"]
                )
                if worker_candidates:
                    chosen_tech_id = worker_candidates[0].technician_id
                    tech_row = await conn.fetchrow(
                        """
                        SELECT u.full_name, u.email, sk.skill::text AS role
                        FROM users u
                        LEFT JOIN staff_skills sk ON sk.user_id = u.id
                        WHERE u.id = $1 LIMIT 1;
                        """,
                        chosen_tech_id
                    )
                    if tech_row:
                        recommended_worker = {
                            "id": str(chosen_tech_id),
                            "name": tech_row["full_name"],
                            "email": tech_row["email"],
                            "role": tech_row["role"] or "Technician"
                        }
                        partial_slots["recommended_technician"] = recommended_worker
            except Exception as e:
                import logging
                logging.getLogger("intake").error(f"Worker pre-scoring error: {e}")
                worker_lookup_failed = True

        if wo_state != "MERGED_DUPLICATE" and not requires_admin_approval and worker_candidates:
            automation_actor_id = await conn.fetchval(
                "SELECT id FROM users WHERE email = 'campusops-automation@internal.local' AND role = 'AI_AUTOMATION';"
            )
            if automation_actor_id:
                reporter_department_id = await conn.fetchval(
                    "SELECT department_id FROM users WHERE id = $1;",
                    reporter_id,
                )
                try:
                    async with conn.transaction():
                        await conn.execute(
                            "SELECT set_secure_context($1::uuid, 'AI_AUTOMATION'::user_role, NULL);",
                            automation_actor_id,
                        )
                        assigned_worker_res = await StaffingService.assign_technician(
                            conn,
                            work_order_id=wo_id,
                            actor_id=automation_actor_id,
                            send_worker_email=False,
                        )
                    wo_state = assigned_worker_res.work_order_state
                    partial_slots["assigned_technician"] = {
                        "id": str(assigned_worker_res.assigned_tech_id),
                        "name": assigned_worker_res.assigned_tech_name,
                        "email": assigned_worker_res.assigned_tech_email,
                        "role": assigned_worker_res.assigned_tech_role,
                    }
                except Exception as e:
                    import logging
                    logging.getLogger("intake").exception("Automatic noncritical dispatch failed: %s", e)
                    dispatch_note = "Automatic dispatch could not be completed; Admin dispatch required."
                finally:
                    await conn.execute(
                        "SELECT set_secure_context($1::uuid, $2::user_role, $3::uuid);",
                        reporter_id,
                        actor_role,
                        reporter_department_id,
                    )
            else:
                dispatch_note = "Automation identity is unavailable; Admin dispatch required."

        no_eligible_worker = wo_state != "MERGED_DUPLICATE" and not worker_candidates and not worker_lookup_failed
        if worker_lookup_failed:
            dispatch_note = "Worker availability could not be verified; Admin dispatch required."
            partial_slots["dispatch_status"] = dispatch_note
        elif no_eligible_worker:
            dispatch_note = f"No available on-shift {category} worker; Admin dispatch required."
            partial_slots["dispatch_status"] = dispatch_note
        elif dispatch_note:
            partial_slots["dispatch_status"] = dispatch_note

        needs_admin_attention = requires_admin_approval or no_eligible_worker or bool(dispatch_note)

        await conn.execute(
            """
            UPDATE work_orders
            SET partial_slots = $2::jsonb,
                blocked_reason = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE blocked_reason END
            WHERE id = $1;
            """,
            wo_id,
            json.dumps(partial_slots),
            dispatch_note if no_eligible_worker or dispatch_note else None,
        )

        # Put the incident in the Admin work queue. P0/P1 reports explicitly request approval;
        # noncritical reports are also visible for oversight and staffing exceptions.
        admin_recipients = await conn.fetch(
            "SELECT id, email FROM users WHERE role IN ('SYS_ADMIN', 'FACILITIES_ADMIN', 'DEPT_MANAGER');"
        )
        notification_subject = (
            f"APPROVAL REQUIRED: P0/P1 incident #{ticket_num}"
            if requires_admin_approval
            else f"Campus incident reported: #{ticket_num}"
        )
        notification_body = (
            f"{extraction.concise_summary} Location: {node['node_code']}. Priority: {urgency}. "
            + (f"Assigned worker: {assigned_worker_res.assigned_tech_name} ({category}). " if assigned_worker_res else "")
            + (f"Recommended worker for Admin review: {recommended_worker['name']} ({category}). " if recommended_worker and not assigned_worker_res else "")
            + (f"{dispatch_note} " if dispatch_note else "")
            + ("Admin approval is required before dispatch." if requires_admin_approval else "Review the report on the work orders dashboard.")
        )
        for recipient in admin_recipients:
            await conn.execute(
                """
                INSERT INTO outbound_notifications (recipient_user_id, recipient_email, subject, body, work_order_id)
                VALUES ($1, $2, $3, $4, $5);
                """,
                recipient["id"],
                recipient["email"],
                notification_subject,
                notification_body,
                wo_id,
            )

        response_payload = {
            "work_order_id": str(wo_id),
            "ticket_number": ticket_num,
            "conversation_thread_id": thread_id,
            "state": wo_state,
            "needs_admin_approval": needs_admin_attention,
            "requires_admin_approval": requires_admin_approval,
            "reporter_urgency": urgency,
            "category": category,
            "target_node_code": node["node_code"],
            "target_node_name": node["name"],
            "room_code": node["node_code"],
            "floor_number": node["floor_number"],
            "assigned_tech_name": assigned_worker_res.assigned_tech_name if assigned_worker_res else None,
            "assigned_tech_email": assigned_worker_res.assigned_tech_email if assigned_worker_res else None,
            "assigned_tech_role": assigned_worker_res.assigned_tech_role if assigned_worker_res else None,
            "recommended_tech_name": recommended_worker["name"] if recommended_worker else None,
            "recommended_tech_role": recommended_worker["role"] if recommended_worker else None,
            "email_dispatched": assigned_worker_res.email_dispatched if assigned_worker_res else False,
            "clarification_needed": False,
            "clarification_question": None,
            "partial_slots": partial_slots,
            "correlation_action": correlation_action,
            "concise_summary": extraction.concise_summary,
            "extractor_used": extraction.extractor_used,
            "emergency_instructions": emergency_instructions,
            "created_at": created_at.isoformat()
        }

        # Complete idempotency record
        if request.idempotency_key:
            await complete_idempotency_key(
                conn,
                source=request.channel,
                idempotency_key=request.idempotency_key,
                response_status=201,
                response_payload=response_payload
            )

        return IntakeResponse(
            is_ticket_created=True,
            decision="ADD_TICKET",
            reply_message=None,
            work_order_id=wo_id,
            ticket_number=ticket_num,
            conversation_thread_id=thread_id,
            state=wo_state,
            needs_admin_approval=needs_admin_attention,
            requires_admin_approval=requires_admin_approval,
            reporter_urgency=urgency,
            category=category,
            target_node_code=node["node_code"],
            target_node_name=node["name"],
            room_code=node["node_code"],
            floor_number=node["floor_number"],
            assigned_tech_name=assigned_worker_res.assigned_tech_name if assigned_worker_res else None,
            assigned_tech_email=assigned_worker_res.assigned_tech_email if assigned_worker_res else None,
            assigned_tech_role=assigned_worker_res.assigned_tech_role if assigned_worker_res else None,
            email_dispatched=assigned_worker_res.email_dispatched if assigned_worker_res else False,
            clarification_needed=False,
            clarification_question=None,
            partial_slots=partial_slots,
            correlation_action=correlation_action,
            concise_summary=extraction.concise_summary,
            extractor_used=extraction.extractor_used,
            emergency_instructions=emergency_instructions,
            created_at=created_at
        )

    @staticmethod
    async def submit_clarification_reply(
        conn: asyncpg.Connection,
        conversation_thread_id: str,
        reply_text: str,
        reporter_id: UUID
    ) -> IntakeResponse:
        """
        Receives user clarification reply on an existing thread.
        Merges new extracted slots into work_orders.partial_slots on the SAME work order.
        If all slots now resolve, transitions the work order to TRIAGED and invokes the Correlator.
        """
        wo = await conn.fetchrow(
            """
            SELECT id, ticket_number, state, category, target_node_id,
                   partial_slots, raw_description, created_at
            FROM work_orders
            WHERE conversation_thread_id = $1
              AND state = 'AWAITING_CLARIFICATION'
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE;
            """,
            conversation_thread_id
        )
        if not wo:
            raise ResourceNotFoundError("Active Awaiting-Clarification Work Order for thread", conversation_thread_id)

        wo_id = wo["id"]
        ticket_num = wo["ticket_number"]
        partial_slots = json.loads(wo["partial_slots"]) if isinstance(wo["partial_slots"], str) else (wo["partial_slots"] or {})

        # Lock-free extraction on reply text
        new_extraction = await extract_incident_entities(reply_text)

        # Merge slots
        merged_room_hint = new_extraction.extracted_room_or_node_hint or partial_slots.get("room_hint")
        merged_cat = new_extraction.category or partial_slots.get("category")

        node, candidates, is_ambiguous = await IntakeService.resolve_campus_node(conn, merged_room_hint)

        if node and merged_cat:
            # Resolved! Transition SAME work order to TRIAGED
            await conn.execute(
                """
                UPDATE work_orders
                SET target_node_id = $2,
                    category = $3::issue_category,
                    state = 'TRIAGED',
                    clarification_question = NULL,
                    partial_slots = '{}'::jsonb,
                    raw_description = raw_description || E'\\n[Clarification Reply]: ' || $4,
                    updated_at = NOW()
                WHERE id = $1;
                """,
                wo_id,
                node["id"],
                merged_cat,
                reply_text
            )

            # Audit record
            await conn.execute(
                """
                INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
                VALUES ($1, $2, 'CLARIFICATION_RESOLVED', 'AWAITING_CLARIFICATION', 'TRIAGED', $3::jsonb);
                """,
                wo_id,
                reporter_id,
                json.dumps({
                    "resolved_room": node["node_code"],
                    "resolved_category": merged_cat,
                    "reply_text": reply_text
                })
            )

            # Execute topological correlation
            correl_res = await CorrelationService.correlate_incident(
                conn,
                work_order_id=wo_id,
                target_node_id=node["id"],
                category=merged_cat,
                actor_id=reporter_id
            )
            final_state = "MERGED_DUPLICATE" if correl_res.get("action") == "MERGED_DUPLICATE" else "TRIAGED"

            return IntakeResponse(
                is_ticket_created=True,
                decision="ADD_TICKET",
                reply_message=None,
                work_order_id=wo_id,
                ticket_number=ticket_num,
                conversation_thread_id=conversation_thread_id,
                state=final_state,
                category=merged_cat,
                target_node_code=node["node_code"],
                target_node_name=node["name"],
                clarification_needed=False,
                clarification_question=None,
                partial_slots={},
                correlation_action=correl_res.get("action", "NONE"),
                concise_summary=f"Resolved in {node['node_code']} ({merged_cat})",
                extractor_used=new_extraction.extractor_used,
                created_at=wo["created_at"]
            )
        else:
            # Still ambiguous or missing fields
            new_q = (
                f"Still need clarification: Please pick from {', '.join([c['node_code'] for c in candidates])}"
                if is_ambiguous else "Could you provide the exact room or category?"
            )
            partial_slots["room_hint"] = merged_room_hint
            partial_slots["category"] = merged_cat

            await conn.execute(
                """
                UPDATE work_orders
                SET partial_slots = $2::jsonb,
                    clarification_question = $3,
                    updated_at = NOW()
                WHERE id = $1;
                """,
                wo_id,
                json.dumps(partial_slots),
                new_q
            )

            return IntakeResponse(
                is_ticket_created=True,
                decision="ADD_TICKET",
                reply_message=None,
                work_order_id=wo_id,
                ticket_number=ticket_num,
                conversation_thread_id=conversation_thread_id,
                state="AWAITING_CLARIFICATION",
                category=merged_cat,
                target_node_code=None,
                target_node_name=None,
                clarification_needed=True,
                clarification_question=new_q,
                partial_slots=partial_slots,
                correlation_action="NONE",
                concise_summary="Clarification in progress",
                extractor_used=new_extraction.extractor_used,
                created_at=wo["created_at"]
            )
