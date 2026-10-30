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
from app.modules.integrations.idempotency import claim_idempotency_key, complete_idempotency_key
from app.modules.intake.schemas import InboundIntakeRequest, IntakeResponse


class IntakeService:

    @staticmethod
    async def resolve_campus_node(
        conn: asyncpg.Connection,
        hint: Optional[str]
    ) -> Tuple[Optional[dict], List[dict], bool]:
        """
        Resolves an extracted room or location hint against campus_nodes.
        Returns:
            (resolved_node, candidate_nodes, is_ambiguous)
        """
        if not hint:
            return None, [], False

        hint_clean = hint.strip().upper()

        # 1. Exact node_code match (e.g. RM-ACAD-204, LAB-ACAD-301, EEC-MAIN)
        exact = await conn.fetchrow(
            """
            SELECT id, node_code, name, building_code, floor_number, node_type
            FROM campus_nodes
            WHERE node_code = $1;
            """,
            hint_clean
        )
        if exact:
            return dict(exact), [], False

        # 2. Check if a known node_code is embedded in the hint
        embedded_match = re.search(
            r"\b(RM-[A-Z0-9-]+|LAB-[A-Z0-9-]+|EEC-[A-Z0-9-]+|SUBSTATION-[A-Z0-9-]+|PANEL-[A-Z0-9-]+|SW-[A-Z0-9-]+|AHU-[A-Z0-9-]+)\b",
            hint,
            re.IGNORECASE
        )
        if embedded_match:
            embedded_code = embedded_match.group(1).upper()
            found = await conn.fetchrow(
                "SELECT id, node_code, name, building_code, floor_number, node_type FROM campus_nodes WHERE node_code = $1;",
                embedded_code
            )
            if found:
                return dict(found), [], False

        # 3. Check floor hints: e.g. "3rd floor lab"
        hint_lower = hint.lower()
        floor_num = None
        if "3rd floor" in hint_lower or "floor 3" in hint_lower or "third floor" in hint_lower:
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

        # 4. Partial name match
        name_match = await conn.fetch(
            """
            SELECT id, node_code, name, building_code, floor_number, node_type
            FROM campus_nodes
            WHERE name ILIKE '%' || $1 || '%'
            LIMIT 5;
            """,
            hint
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

        # Phase 3: Location Resolution
        node, candidates, is_ambiguous = await IntakeService.resolve_campus_node(
            conn, extraction.extracted_room_or_node_hint
        )

        category = extraction.category
        urgency = extraction.reporter_urgency

        clarification_needed = False
        clarification_question = None
        partial_slots = {
            "room_hint": extraction.extracted_room_or_node_hint,
            "asset_hint": extraction.extracted_asset_hint,
            "category": category,
            "safety_hazard": extraction.safety_hazard_detected,
        }

        if is_ambiguous:
            clarification_needed = True
            cand_codes = [c["node_code"] for c in candidates]
            partial_slots["candidate_rooms"] = cand_codes
            clarification_question = (
                f"Multiple rooms match on that floor: {', '.join(cand_codes)}. "
                "Which specific room or lab are you reporting from?"
            )
            wo_state = "AWAITING_CLARIFICATION"
        elif not node or not category:
            clarification_needed = True
            if not node and not category:
                clarification_question = "Could you specify the room or lab number, and describe the type of fault?"
            elif not node:
                clarification_question = "Could you please specify the room number, lab code, or building name?"
            else:
                clarification_question = "Could you clarify the category of the issue (electrical, network, AC, plumbing, or projector)?"
            wo_state = "AWAITING_CLARIFICATION"
        else:
            wo_state = "TRIAGED"

        # Department mapping
        target_node_id = node["id"] if node else None
        target_dept_id = None
        if node:
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
            b_code = node["building_code"] if node else None
            r_code = node["node_code"] if node else None
            raw_instructions = await InstructionAgent.generate_safety_instructions(
                raw_description=request.text,
                detected_building=b_code,
                detected_room=r_code
            )
            grounded_instructions = await AntiHallucinationAgent.verify_and_ground_emergency(raw_instructions)
            emergency_instructions = grounded_instructions.model_dump()
            partial_slots["emergency_instructions"] = emergency_instructions

        # Phase 4: Atomic Operational Commit
        row = await conn.fetchrow(
            """
            INSERT INTO work_orders (
                conversation_thread_id, reporter_user_id, target_node_id,
                category, reporter_urgency, calculated_priority, state,
                raw_description, ai_summary, partial_slots, clarification_question,
                department_id
            )
            VALUES ($1, $2, $3, $4::issue_category, $5::priority_level, $5::priority_level,
                    $6::wo_state, $7, $8, $9::jsonb, $10, $11)
            RETURNING id, ticket_number, created_at;
            """,
            thread_id,
            reporter_id,
            target_node_id,
            category,
            urgency,
            wo_state,
            request.text,
            extraction.concise_summary,
            json.dumps(partial_slots),
            clarification_question,
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
                "clarification_needed": clarification_needed,
                "channel": request.channel
            })
        )

        # Correlation execution if resolved
        correlation_action = "NONE"
        if wo_state == "TRIAGED":
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
        elif clarification_needed:
            # Queue clarification question notification
            user_email = await conn.fetchval("SELECT email FROM users WHERE id = $1;", reporter_id)
            await conn.execute(
                """
                INSERT INTO outbound_notifications (recipient_user_id, recipient_email, subject, body, work_order_id)
                VALUES ($1, $2, $3, $4, $5);
                """,
                reporter_id,
                user_email or "student@easwari.edu",
                f"Action Required: Clarification for Ticket #{ticket_num}",
                clarification_question,
                wo_id
            )

        response_payload = {
            "work_order_id": str(wo_id),
            "ticket_number": ticket_num,
            "conversation_thread_id": thread_id,
            "state": wo_state,
            "category": category,
            "target_node_code": node["node_code"] if node else None,
            "target_node_name": node["name"] if node else None,
            "clarification_needed": clarification_needed,
            "clarification_question": clarification_question,
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
            work_order_id=wo_id,
            ticket_number=ticket_num,
            conversation_thread_id=thread_id,
            state=wo_state,
            category=category,
            target_node_code=node["node_code"] if node else None,
            target_node_name=node["name"] if node else None,
            clarification_needed=clarification_needed,
            clarification_question=clarification_question,
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
