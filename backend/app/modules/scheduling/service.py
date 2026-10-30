import json
from uuid import UUID
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncpg
from app.core.exceptions import ResourceNotFoundError, InvariantViolationError, CampusOpsException
from app.modules.scheduling.schemas import (
    BookingCreateRequest,
    BookingResponse,
    RoomAlternativeResponse,
)


class SchedulingService:

    @staticmethod
    async def list_bookings(
        conn: asyncpg.Connection,
        room_node_id: Optional[UUID] = None,
        booking_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[BookingResponse]:
        query = """
            SELECT rb.id, rb.room_node_id, cn.node_code AS room_code, cn.name AS room_name,
                   cn.building_code, rb.booking_type, rb.course_or_event_title,
                   rb.faculty_user_id, rb.student_count, rb.required_features,
                   lower(rb.time_slot) AS start_time, upper(rb.time_slot) AS end_time,
                   rb.status, rb.linked_work_order_id, rb.relocated_to_booking_id,
                   rb.compromise_explanation, rb.created_at
            FROM room_bookings rb
            JOIN campus_nodes cn ON cn.id = rb.room_node_id
            WHERE ($1::uuid IS NULL OR rb.room_node_id = $1)
              AND ($2::text IS NULL OR rb.booking_type = $2)
              AND ($3::text IS NULL OR rb.status = $3)
            ORDER BY lower(rb.time_slot) ASC;
        """
        rows = await conn.fetch(query, room_node_id, booking_type, status)
        return [
            BookingResponse(
                id=r["id"],
                room_node_id=r["room_node_id"],
                room_code=r["room_code"],
                room_name=r["room_name"],
                building_code=r["building_code"],
                booking_type=r["booking_type"],
                course_or_event_title=r["course_or_event_title"],
                faculty_user_id=r["faculty_user_id"],
                student_count=r["student_count"],
                required_features=list(r["required_features"] or []),
                start_time=r["start_time"],
                end_time=r["end_time"],
                status=r["status"],
                linked_work_order_id=r["linked_work_order_id"],
                relocated_to_booking_id=r["relocated_to_booking_id"],
                compromise_explanation=r["compromise_explanation"],
                created_at=r["created_at"]
            )
            for r in rows
        ]

    @staticmethod
    async def create_booking(
        conn: asyncpg.Connection,
        request: BookingCreateRequest,
        actor_id: Optional[UUID] = None
    ) -> BookingResponse:
        # Check node operational
        node = await conn.fetchrow("SELECT id, node_code, name, building_code, is_operational FROM campus_nodes WHERE id = $1;", request.room_node_id)
        if not node:
            raise ResourceNotFoundError("CampusNode", str(request.room_node_id))
        if not node["is_operational"] and request.booking_type in ('CLASS', 'EXAM', 'CONTINGENCY_HOLD'):
            raise InvariantViolationError("Room Booking Invariant", f"Cannot book room {node['node_code']} because it is non-operational.")

        faculty_id = request.faculty_user_id
        if request.booking_type in ('CLASS', 'EXAM') and not faculty_id:
            faculty_id = actor_id

        try:
            row = await conn.fetchrow(
                """
                INSERT INTO room_bookings (
                    room_node_id, booking_type, course_or_event_title,
                    faculty_user_id, student_count, required_features,
                    time_slot, status, linked_work_order_id
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6,
                    tstzrange($7, $8, '[)'), 'CONFIRMED', $9
                )
                RETURNING id, room_node_id, booking_type, course_or_event_title,
                          faculty_user_id, student_count, required_features,
                          lower(time_slot) AS start_time, upper(time_slot) AS end_time,
                          status, linked_work_order_id, relocated_to_booking_id,
                          compromise_explanation, created_at;
                """,
                request.room_node_id,
                request.booking_type,
                request.course_or_event_title,
                faculty_id,
                request.student_count,
                request.required_features,
                request.start_time,
                request.end_time,
                request.linked_work_order_id
            )
        except asyncpg.exceptions.ExclusionViolationError as e:
            raise InvariantViolationError(
                "Room Double-Booking GiST Invariant",
                f"Room {node['node_code']} is already booked during the requested time window."
            )

        return BookingResponse(
            id=row["id"],
            room_node_id=row["room_node_id"],
            room_code=node["node_code"],
            room_name=node["name"],
            building_code=node["building_code"],
            booking_type=row["booking_type"],
            course_or_event_title=row["course_or_event_title"],
            faculty_user_id=row["faculty_user_id"],
            student_count=row["student_count"],
            required_features=list(row["required_features"] or []),
            start_time=row["start_time"],
            end_time=row["end_time"],
            status=row["status"],
            linked_work_order_id=row["linked_work_order_id"],
            relocated_to_booking_id=row["relocated_to_booking_id"],
            compromise_explanation=row["compromise_explanation"],
            created_at=row["created_at"]
        )

    @staticmethod
    async def find_alternative_rooms(
        conn: asyncpg.Connection,
        current_room_id: UUID,
        student_count: int,
        required_features: List[str],
        start_time: datetime,
        end_time: datetime
    ) -> List[RoomAlternativeResponse]:
        """
        Deterministic Constraint Satisfaction Problem (CSP) solver:
        Hard Constraints:
          - node_type == 'ROOM'
          - is_operational == TRUE
          - room_capacity >= student_count
          - room_features @> required_features
          - room_id <> current_room_id
          - NOT EXISTS overlapping active booking in time_slot
        Soft Scoring:
          - Building penalty: 0 if same building, +20.0 if different block
          - Floor delta penalty: abs(floor - current_floor) * 5.0
          - Wasted capacity penalty: (capacity - student_count) * 0.5
        """
        curr_room = await conn.fetchrow(
            "SELECT id, node_code, name, building_code, floor_number FROM campus_nodes WHERE id = $1;",
            current_room_id
        )
        if not curr_room:
            raise ResourceNotFoundError("CampusNode", str(current_room_id))

        curr_bldg = curr_room["building_code"]
        curr_floor = curr_room["floor_number"]

        query = """
            SELECT cn.id, cn.node_code, cn.name, cn.building_code, cn.floor_number,
                   cn.room_capacity, cn.room_features
            FROM campus_nodes cn
            WHERE cn.node_type = 'ROOM'
              AND cn.is_operational = TRUE
              AND cn.room_capacity >= $1
              AND cn.room_features @> $2::text[]
              AND cn.id <> $3
              AND NOT EXISTS (
                  SELECT 1 FROM room_bookings rb
                  WHERE rb.room_node_id = cn.id
                    AND rb.status IN ('CONFIRMED', 'CONTINGENCY_HOLD', 'MAINTENANCE_BLOCK')
                    AND rb.time_slot && tstzrange($4, $5, '[)')
              )
            ORDER BY cn.room_capacity ASC;
        """
        candidates = await conn.fetch(query, student_count, required_features, current_room_id, start_time, end_time)

        results = []
        for cand in candidates:
            is_same = (cand["building_code"] == curr_bldg)
            bldg_pen = 0.0 if is_same else 20.0
            floor_delta = abs(cand["floor_number"] - curr_floor)
            floor_pen = floor_delta * 5.0
            wasted = cand["room_capacity"] - student_count
            wasted_pen = wasted * 0.5
            total_penalty = round(bldg_pen + floor_pen + wasted_pen, 2)

            b_target = cand["building_code"]
            loc_msg = "Same building" if is_same else f"Relocated from {curr_bldg} to {b_target}"
            explanation = f"{loc_msg}, Floor delta: {floor_delta}, Wasted seats: {wasted} (Score penalty: {total_penalty})."

            results.append(
                RoomAlternativeResponse(
                    room_id=cand["id"],
                    room_code=cand["node_code"],
                    room_name=cand["name"],
                    building_code=cand["building_code"],
                    floor_number=cand["floor_number"],
                    room_capacity=cand["room_capacity"],
                    room_features=list(cand["room_features"] or []),
                    penalty_score=total_penalty,
                    is_same_building=is_same,
                    floor_delta=floor_delta,
                    wasted_seats=wasted,
                    explanation=explanation
                )
            )

        # Sort by penalty ascending
        results.sort(key=lambda r: r.penalty_score)
        return results

    @staticmethod
    async def relocate_booking(
        conn: asyncpg.Connection,
        booking_id: UUID,
        target_room_id: UUID,
        actor_id: Optional[UUID] = None,
        reason: str = "Relocation executed due to operational disruption."
    ) -> BookingResponse:
        """
        Atomically relocates a confirmed booking to an alternative room.
        Transitions original booking to RELOCATED and creates target booking in CONFIRMED state.
        """
        orig = await conn.fetchrow(
            """
            SELECT id, room_node_id, booking_type, course_or_event_title,
                   faculty_user_id, student_count, required_features,
                   lower(time_slot) AS start_time, upper(time_slot) AS end_time,
                   status, linked_work_order_id
            FROM room_bookings
            WHERE id = $1
            FOR UPDATE;
            """,
            booking_id
        )
        if not orig:
            raise ResourceNotFoundError("RoomBooking", str(booking_id))

        if orig["status"] not in ('CONFIRMED', 'IMPACTED_NEEDS_MOVE'):
            raise InvariantViolationError("Booking Relocation", f"Booking {booking_id} has status {orig['status']} and cannot be relocated.")

        target_node = await conn.fetchrow(
            "SELECT id, node_code, name, building_code, is_operational, room_capacity FROM campus_nodes WHERE id = $1;",
            target_room_id
        )
        if not target_node:
            raise ResourceNotFoundError("CampusNode (Target Room)", str(target_room_id))

        if not target_node["is_operational"]:
            raise InvariantViolationError("Target Room Invariant", f"Target room {target_node['node_code']} is marked non-operational.")

        if target_node["room_capacity"] < orig["student_count"]:
            raise InvariantViolationError(
                "Capacity Invariant",
                f"Target room capacity ({target_node['room_capacity']}) is less than required student count ({orig['student_count']})."
            )

        # 1. Insert new booking
        new_booking = await conn.fetchrow(
            """
            INSERT INTO room_bookings (
                room_node_id, booking_type, course_or_event_title,
                faculty_user_id, student_count, required_features,
                time_slot, status, linked_work_order_id, compromise_explanation
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                tstzrange($7, $8, '[)'), 'CONFIRMED', $9, $10
            )
            RETURNING id, room_node_id, booking_type, course_or_event_title,
                      faculty_user_id, student_count, required_features,
                      lower(time_slot) AS start_time, upper(time_slot) AS end_time,
                      status, linked_work_order_id, relocated_to_booking_id,
                      compromise_explanation, created_at;
            """,
            target_room_id,
            orig["booking_type"],
            orig["course_or_event_title"],
            orig["faculty_user_id"],
            orig["student_count"],
            orig["required_features"],
            orig["start_time"],
            orig["end_time"],
            orig["linked_work_order_id"],
            f"Relocated from room {orig['room_node_id']}: {reason}"
        )

        # 2. Update original booking
        await conn.execute(
            """
            UPDATE room_bookings
            SET status = 'RELOCATED',
                relocated_to_booking_id = $2,
                compromise_explanation = $3
            WHERE id = $1;
            """,
            booking_id,
            new_booking["id"],
            reason
        )

        # 3. Log audit
        await conn.execute(
            """
            INSERT INTO audit_logs (work_order_id, actor_user_id, action, previous_state, new_state, details)
            VALUES ($1, $2, 'BOOKING_RELOCATED', $3, 'RELOCATED', $4::jsonb);
            """,
            orig["linked_work_order_id"],
            actor_id,
            orig["status"],
            json.dumps({
                "original_booking_id": str(booking_id),
                "original_room_id": str(orig["room_node_id"]),
                "new_booking_id": str(new_booking["id"]),
                "new_room_id": str(target_room_id),
                "reason": reason
            })
        )

        return BookingResponse(
            id=new_booking["id"],
            room_node_id=new_booking["room_node_id"],
            room_code=target_node["node_code"],
            room_name=target_node["name"],
            building_code=target_node["building_code"],
            booking_type=new_booking["booking_type"],
            course_or_event_title=new_booking["course_or_event_title"],
            faculty_user_id=new_booking["faculty_user_id"],
            student_count=new_booking["student_count"],
            required_features=list(new_booking["required_features"] or []),
            start_time=new_booking["start_time"],
            end_time=new_booking["end_time"],
            status=new_booking["status"],
            linked_work_order_id=new_booking["linked_work_order_id"],
            relocated_to_booking_id=new_booking["relocated_to_booking_id"],
            compromise_explanation=new_booking["compromise_explanation"],
            created_at=new_booking["created_at"]
        )

    @staticmethod
    async def cancel_booking(conn: asyncpg.Connection, booking_id: UUID) -> bool:
        row = await conn.fetchrow("SELECT id FROM room_bookings WHERE id = $1;", booking_id)
        if not row:
            raise ResourceNotFoundError("RoomBooking", str(booking_id))
        await conn.execute("DELETE FROM room_bookings WHERE id = $1;", booking_id)
        return True

