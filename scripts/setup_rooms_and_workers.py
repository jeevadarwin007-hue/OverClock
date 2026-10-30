import asyncio
import asyncpg

ROOMS_DATA = [
    # EEC-ACAD (Academic Tech Block)
    ("RM-ACAD-101", "Ground Floor Smart Class 101", "ROOM", "EEC-ACAD", 1, 70, ["PROJECTOR", "AC"], True, 15),
    ("RM-ACAD-102", "Ground Floor Lecture Hall 102", "ROOM", "EEC-ACAD", 1, 75, ["PROJECTOR", "AC"], True, 15),
    ("RM-ACAD-201", "CSE Department Classroom 201", "ROOM", "EEC-ACAD", 2, 70, ["PROJECTOR", "AC"], True, 15),
    ("RM-ACAD-202", "IT Department Classroom 202", "ROOM", "EEC-ACAD", 2, 80, ["PROJECTOR", "AC"], True, 15),
    ("RM-ACAD-204", "CSE/IT 2nd Floor Smart Classroom", "ROOM", "EEC-ACAD", 2, 110, ["PROJECTOR", "AC", "AUDIO_SYSTEM", "SMART_BOARD"], True, 25),
    ("LAB-ACAD-301", "Advanced Computing & AI Lab", "ROOM", "EEC-ACAD", 3, 75, ["HIGH_SPEED_LAN", "AC", "UPS_BACKUP"], True, 25),
    ("LAB-ACAD-302", "Data Structures & Cloud Lab", "ROOM", "EEC-ACAD", 3, 75, ["HIGH_SPEED_LAN", "AC", "UPS_BACKUP"], True, 25),
    ("LAB-ACAD-304", "Networks & Cybersecurity Lab", "ROOM", "EEC-ACAD", 3, 75, ["HIGH_SPEED_LAN", "AC", "UPS_BACKUP"], True, 25),
    ("RM-ACAD-401", "ECE Department Seminar Hall", "ROOM", "EEC-ACAD", 4, 90, ["PROJECTOR", "AC", "AUDIO_SYSTEM"], True, 18),
    ("RM-ACAD-402", "VLSI & Embedded Systems Lab", "ROOM", "EEC-ACAD", 4, 60, ["PROJECTOR", "AC", "HIGH_SPEED_LAN"], True, 15),

    # EEC-MECH-PG (Mechanical & PG Library Block)
    ("RM-MECH-101", "Engineering Graphics Drawing Hall", "ROOM", "EEC-MECH-PG", 1, 80, ["PROJECTOR"], True, 12),
    ("RM-MECH-102", "PG Mechanical Smart Lecture Hall", "ROOM", "EEC-MECH-PG", 1, 125, ["PROJECTOR", "AC", "AUDIO_SYSTEM", "WHEELCHAIR_RAMP", "SMART_BOARD"], True, 22),
    ("RM-MECH-201", "Fluid Dynamics & Thermal Lab", "ROOM", "EEC-MECH-PG", 2, 50, ["EXHAUST_SYSTEM"], True, 12),
    ("RM-MECH-202", "CAD/CAM Simulation Centre", "ROOM", "EEC-MECH-PG", 2, 60, ["HIGH_SPEED_LAN", "AC", "UPS_BACKUP"], True, 16),
    ("RM-MECH-301", "Central PG Research Reading Room", "ROOM", "EEC-MECH-PG", 3, 70, ["AC", "HIGH_SPEED_LAN"], True, 14),
    ("RM-MECH-302", "Digital Library Resource Centre", "ROOM", "EEC-MECH-PG", 3, 80, ["HIGH_SPEED_LAN", "AC", "UPS_BACKUP"], True, 18),
    ("RM-MECH-401", "Mechanical & Civil Seminar Hall", "ROOM", "EEC-MECH-PG", 4, 100, ["PROJECTOR", "AC", "AUDIO_SYSTEM"], True, 16),
    ("RM-MECH-402", "Mechatronics & Automation Studio", "ROOM", "EEC-MECH-PG", 4, 50, ["AC", "HIGH_SPEED_LAN"], True, 14),

    # EEC-MAIN (Administrative Block)
    ("RM-MAIN-101", "Admissions & Counselling Centre", "ROOM", "EEC-MAIN", 1, 60, ["AC", "DISPLAY_PANEL"], True, 15),
    ("RM-MAIN-102", "Executive Boardroom", "ROOM", "EEC-MAIN", 1, 30, ["PROJECTOR", "AC", "AUDIO_SYSTEM"], True, 20),
    ("RM-MAIN-201", "Controller of Examinations Strongroom", "ROOM", "EEC-MAIN", 2, 25, ["CCTV_SURVEILLANCE", "AC", "BIOMETRIC_ACCESS"], True, 28),
    ("RM-MAIN-202", "Academic Council Chamber", "ROOM", "EEC-MAIN", 2, 40, ["PROJECTOR", "AC", "AUDIO_SYSTEM"], True, 22),
    ("RM-MAIN-301", "Campus Central Data Centre", "ROOM", "EEC-MAIN", 3, 15, ["PRECISION_AC", "FIRE_SUPPRESSION", "UPS_BACKUP"], True, 30),
    ("RM-MAIN-302", "ERP & Digital Governance Cell", "ROOM", "EEC-MAIN", 3, 20, ["HIGH_SPEED_LAN", "AC"], True, 16),

    # EEC-ROBOTICS (ABB Centre)
    ("RM-ROB-101", "ABB Industrial Robot Workcell Lab", "ROOM", "EEC-ROBOTICS", 1, 45, ["THREE_PHASE_POWER", "AC", "SAFETY_CAGE"], True, 20),
    ("RM-ROB-102", "Cobot & Machine Vision Station", "ROOM", "EEC-ROBOTICS", 1, 40, ["AC", "HIGH_SPEED_LAN"], True, 18),
    ("RM-ROB-201", "Industry 4.0 IoT Prototype Studio", "ROOM", "EEC-ROBOTICS", 2, 50, ["AC", "HIGH_SPEED_LAN", "3D_PRINTER"], True, 18),
    ("RM-ROB-202", "Autonomous Mobile Robotics Arena", "ROOM", "EEC-ROBOTICS", 2, 40, ["SAFETY_NET", "HIGH_SPEED_LAN"], True, 16),

    # EEC-AUD-FC (Auditorium & Food Court)
    ("RM-AUD-MAIN", "TRP Main Auditorium Hall", "ROOM", "EEC-AUD-FC", 1, 850, ["CENTRAL_AC", "STAGE_LIGHTING", "LINE_ARRAY_AUDIO"], True, 24),
    ("RM-AUD-MINI", "TRP Mini AV Amphitheatre", "ROOM", "EEC-AUD-FC", 2, 150, ["PROJECTOR", "AC", "AUDIO_SYSTEM"], True, 18),
    ("RM-FC-101", "Student Food Court Dining Hall", "ROOM", "EEC-AUD-FC", 1, 300, ["EXHAUST_SYSTEM", "WASH_COUNTERS"], True, 14),
    ("RM-FC-201", "Faculty & Guest Dining Lounge", "ROOM", "EEC-AUD-FC", 2, 80, ["AC", "WIFI"], True, 12),
]

async def setup():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/campusops')
    print("1. Adding room_code and floor_number to work_orders...")
    await conn.execute("ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS room_code VARCHAR(64);")
    await conn.execute("ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS floor_number INT;")

    print("2. Seeding campus rooms...")
    inserted = 0
    for code, name, ntype, bcode, floor, cap, feats, is_op, crit in ROOMS_DATA:
        await conn.execute("""
            INSERT INTO campus_nodes (node_code, name, node_type, building_code, floor_number, room_capacity, room_features, is_operational, criticality_weight)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (node_code) DO UPDATE
            SET name = EXCLUDED.name,
                building_code = EXCLUDED.building_code,
                floor_number = EXCLUDED.floor_number,
                is_operational = EXCLUDED.is_operational;
        """, code, name, ntype, bcode, floor, cap, feats, is_op, crit)
        inserted += 1
    print(f"  + Seeded {inserted} campus rooms.")

    print("3. Ensuring technician skills for Arun...")
    tech_id = await conn.fetchval("SELECT id FROM users WHERE email = 'jeevadarwin007@gmail.com';")
    if tech_id:
        categories = ["ELECTRICAL", "HVAC", "PLUMBING", "NETWORK", "AV_EQUIPMENT", "STRUCTURAL_SAFETY"]
        for cat in categories:
            await conn.execute("""
                INSERT INTO staff_skills (user_id, skill, proficiency_level)
                VALUES ($1, $2::issue_category, 5)
                ON CONFLICT (user_id, skill) DO UPDATE SET proficiency_level = 5;
            """, tech_id, cat)
        print(f"  + Granted skills across all trades to technician Arun ({tech_id}).")

    print("4. Cleaning up unassigned Campus General test tickets (#6, #7, #8)...")
    await conn.execute("ALTER TABLE audit_logs DISABLE TRIGGER ALL;")
    await conn.execute("DELETE FROM outbound_notifications WHERE work_order_id IN (SELECT id FROM work_orders WHERE ticket_number IN (6, 7, 8));")
    await conn.execute("DELETE FROM audit_logs WHERE work_order_id IN (SELECT id FROM work_orders WHERE ticket_number IN (6, 7, 8));")
    await conn.execute("DELETE FROM work_orders WHERE ticket_number IN (6, 7, 8);")
    await conn.execute("ALTER TABLE audit_logs ENABLE TRIGGER ALL;")
    print("  + Cleaned up test tickets.")

    print("5. Updating fsm_state_transitions to allow auto-assignment during intake...")
    await conn.execute("""
        UPDATE fsm_state_transitions
        SET allowed_roles = array_append(allowed_roles, 'STUDENT_FACULTY'::user_role)
        WHERE from_state IN ('INGESTED', 'TRIAGED', 'AWAITING_CLARIFICATION')
          AND to_state = 'ASSIGNED'
          AND NOT ('STUDENT_FACULTY'::user_role = ANY(allowed_roles));
    """)
    print("  + fsm_state_transitions updated.")

    await conn.close()
    print("Setup completed successfully.")

if __name__ == "__main__":
    asyncio.run(setup())
