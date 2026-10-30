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
    
    if parts_count > 0:
        parts = await conn.fetch("SELECT sku, name FROM inventory_parts LIMIT 5;")
        for p in parts:
            print("  Part:", p["sku"], p["name"])
            
    if rooms_count > 0:
        rooms = await conn.fetch("SELECT node_code, name FROM campus_nodes WHERE node_type = 'ROOM' LIMIT 5;")
        for r in rooms:
            print("  Room:", r["node_code"], r["name"])
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
