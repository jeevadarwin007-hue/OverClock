import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import asyncio
import asyncpg
from app.database import acquire_db_connection, init_db_pool, close_db_pool
from app.modules.intake.service import IntakeService
from app.modules.intake.schemas import InboundIntakeRequest

async def test_all():
    print("=" * 70)
    print("DIRECT INTAKE PIPELINE TEST: ROOM VALIDATION, TICKET CREATION & GROQ EMAIL")
    print("=" * 70)

    await init_db_pool()

    # Fetch a student/faculty user ID to act as reporter
    conn_tmp = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/campusops')
    user = await conn_tmp.fetchrow("SELECT id, role, department_id FROM users WHERE role = 'STUDENT_FACULTY' LIMIT 1;")
    if not user:
        user = await conn_tmp.fetchrow("SELECT id, role, department_id FROM users LIMIT 1;")
    reporter_id = user["id"]
    reporter_role = user["role"]
    dept_id = user["department_id"]
    await conn_tmp.close()

    # 1. Test non-problem: "hello there"
    print("\n[TEST 1] Submitting greeting: 'hello there'...")
    async with acquire_db_connection(actor_id=reporter_id, actor_role=reporter_role, dept_id=dept_id) as conn:
        async with conn.transaction():
            res1 = await IntakeService.process_intake(
                conn,
                request=InboundIntakeRequest(text="hello there", channel="PORTAL_FORM"),
                reporter_id=reporter_id,
                actor_role=reporter_role
            )
            print(f"Decision: {res1.decision}")
            print(f"is_ticket_created: {res1.is_ticket_created}")
            print(f"Reply: {res1.reply_message}")
            assert res1.is_ticket_created is False, "Greeting should NOT create a ticket!"
            assert res1.decision == "REPLY_QUESTION", "Greeting should return REPLY_QUESTION!"
            print("  [PASS] Greeting did not create a ticket.")

    # 2. Test problem with non-existent room: "lights sparking in room 999"
    print("\n[TEST 2] Submitting problem with non-existent room: 'lights sparking in room 999'...")
    async with acquire_db_connection(actor_id=reporter_id, actor_role=reporter_role, dept_id=dept_id) as conn:
        async with conn.transaction():
            res2 = await IntakeService.process_intake(
                conn,
                request=InboundIntakeRequest(text="lights sparking in room 999", channel="PORTAL_FORM"),
                reporter_id=reporter_id,
                actor_role=reporter_role
            )
            print(f"Decision: {res2.decision}")
            print(f"is_ticket_created: {res2.is_ticket_created}")
            print(f"Reply: {res2.reply_message}")
            assert res2.is_ticket_created is False, "Non-existent room should NOT create a ticket!"
            assert "no room available in that name" in res2.reply_message.lower(), "Must state there is no room available in that name!"
            print("  [PASS] Non-existent room rejected without creating a ticket.")

    # 3. Test problem with no room specified: "power outage suddenly happened"
    print("\n[TEST 3] Submitting problem with no room specified: 'power outage suddenly happened'...")
    async with acquire_db_connection(actor_id=reporter_id, actor_role=reporter_role, dept_id=dept_id) as conn:
        async with conn.transaction():
            res3 = await IntakeService.process_intake(
                conn,
                request=InboundIntakeRequest(text="power outage suddenly happened", channel="PORTAL_FORM"),
                reporter_id=reporter_id,
                actor_role=reporter_role
            )
            print(f"Decision: {res3.decision}")
            print(f"is_ticket_created: {res3.is_ticket_created}")
            print(f"Reply: {res3.reply_message}")
            assert res3.is_ticket_created is False, "Missing room should NOT create a ticket!"
            assert "no room available in that name" in res3.reply_message.lower(), "Must state there is no room available in that name!"
            print("  [PASS] Unspecified room rejected without creating a ticket.")

    # 4. Test valid incident with valid room: "Electrical short circuit sparks near switchboard in RM-ACAD-204!"
    print("\n[TEST 4] Submitting valid incident: 'Electrical short circuit sparks near switchboard in RM-ACAD-204!'...")
    ticket_num = None
    async with acquire_db_connection(actor_id=reporter_id, actor_role=reporter_role, dept_id=dept_id) as conn:
        async with conn.transaction():
            res4 = await IntakeService.process_intake(
                conn,
                request=InboundIntakeRequest(
                    text="Electrical short circuit sparks near switchboard in RM-ACAD-204!",
                    channel="PORTAL_FORM"
                ),
                reporter_id=reporter_id,
                actor_role=reporter_role
            )
            ticket_num = res4.ticket_number
            print(f"Ticket Number: #{ticket_num}")
            print(f"State: {res4.state}")
            print(f"Room Code: {res4.room_code}")
            print(f"Floor Number: {res4.floor_number}")
            print(f"Assigned Worker: {res4.assigned_tech_name} ({res4.assigned_tech_role})")
            print(f"Worker Email: {res4.assigned_tech_email}")
            print(f"Email Dispatched: {res4.email_dispatched}")

            assert res4.is_ticket_created is True, "Valid incident MUST create a ticket!"
            assert res4.room_code == "RM-ACAD-204", "Room code MUST match RM-ACAD-204!"
            assert res4.floor_number == 2, "Floor number MUST be 2!"
            assert res4.state == "ASSIGNED", "State MUST be ASSIGNED!"
            assert res4.assigned_tech_name is not None, "Technician MUST be assigned!"
            print("  [PASS] Ticket created, room & floor stored, technician assigned, and email dispatched.")

    # 5. Check outbound notifications in DB
    print("\n[TEST 5] Checking DB outbound_notifications for Groq-generated dispatch email...")
    conn_db = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/campusops')
    notif = await conn_db.fetchrow("""
        SELECT subject, body, recipient_email, delivery_status, created_at 
        FROM outbound_notifications 
        ORDER BY created_at DESC LIMIT 1;
    """)
    if notif:
        print(f"Recipient: {notif['recipient_email']}")
        print(f"Subject: {notif['subject']}")
        print(f"Delivery Status: {notif['delivery_status']}")
        print(f"HTML Body Preview:\n{notif['body'][:400]}...")
    await conn_db.close()
    await close_db_pool()
    print("  [PASS] Verified Groq email record in DB.")

if __name__ == "__main__":
    asyncio.run(test_all())
