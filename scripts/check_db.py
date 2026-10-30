import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/campusops")
    parts_count = await conn.fetchval("SELECT count(*) FROM inventory_parts;")
    rooms_count = await conn.fetchval("SELECT count(*) FROM campus_nodes WHERE node_type = 'ROOM';")
    bookings_count = await conn.fetchval("SELECT count(*) FROM room_bookings;")
    wo_count = await conn.fetchval("SELECT count(*) FROM work_orders;")
    appr_count = await conn.fetchval("SELECT count(*) FROM approvals;")
    print(f"Inventory Parts: {parts_count}, Campus Rooms: {rooms_count}, Bookings: {bookings_count}, WorkOrders: {wo_count}, Approvals: {appr_count}")
    
    users = await conn.fetch("SELECT id, full_name, email, role FROM users;")
    print("\nUsers in DB:")
    for u in users:
        print(f"  {u['id']}: {u['full_name']} ({u['email']}) - Role: {u['role']}")
        
    skills = await conn.fetch("SELECT user_id, skill FROM staff_skills;")
    print(f"\nStaff Skills count: {len(skills)}")
    for s in skills:
        print(f"  User {s['user_id']} -> Skill: {s['skill']}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
