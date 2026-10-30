# CampusOps: Intelligent Campus Operations & Consequence Platform
**Target Campus:** SRM Easwari Engineering College (Autonomous), Ramapuram, Chennai  
**Geographic Coordinates:** `13.0324° N, 80.1810° E`

---

## 1. Vision & Core Philosophy
CampusOps operates on a strict neuro-symbolic divide and transactional operational loop:
$$\text{Simulate (Read-Only)} \longrightarrow \text{Approve (Separation of Duties)} \longrightarrow \text{Execute (Revalidated Atomic Tx)} \longrightarrow \text{Prove (Live DB Invariants)}$$

* **Neuro-Symbolic Isolation:** AI is bounded to unstructured text extraction, stateful conversational slot clarification, duplicate semantic hints, and grounded natural-language briefing phrasing. Critical incidents remain in Admin review. A separate deterministic staffing rule may assign eligible technicians to noncritical P2/P3 work orders; a database guard limits that actor to matching skills, active shifts, availability, and workload checks.
* **Zero External I/O in DB Transactions:** LLM API queries, SMTP/webhook notifications, and external HTTP calls execute strictly outside operational database transaction boundaries.

---

## 2. SRM Easwari Campus Architecture & 2.5D GeoJSON Twin
The spatial digital twin maps the 5 core campus blocks:
1. `EEC-MAIN`: Main Administrative Block (4 floors, 14.0m height)
2. `EEC-ACAD`: Academic Tech Block [CSE, IT, AI&DS, ECE] (5 floors, 17.5m height)
3. `EEC-MECH-PG`: Mechanical, Civil & Central PG Library Block (4 floors, 14.0m height)
4. `EEC-ROBOTICS`: ABB Robotics Research & Automation Centre (2 floors, 7.0m height)
5. `EEC-AUD-FC`: TRP Auditorium & Central Food Court (2 floors, 8.0m height)

### Demonstration Fixtures
* **Exam Disruption Venue:** Room `RM-ACAD-204` (CSE/IT 2nd Floor Smart Classroom, capacity 110, semester exam scheduled).
* **Alternative Relocation Room:** Room `RM-MECH-102` (PG Mechanical Block, capacity 125, projector & wheelchair ramp verified).
* **Faulty Part Shortage:** `PART-MCCB-63A` (63A 4-Pole Distribution Breaker) seeded with `physical_on_hand_qty = 0, available_qty = 0, reserved_qty = 0`.
* **Wi-Fi Storm Nodes:** Labs `LAB-ACAD-301`, `LAB-ACAD-302`, and `LAB-ACAD-304` sharing upstream PoE distribution switch `SW-CORE-ACAD-F3`.

---

## 3. Database Invariant Kernel (PostgreSQL 16)
The symbolic kernel enforces 6 critical invariants directly within PostgreSQL:
1. **Room Double-Booking Prevention:** GiST exclusion constraint (`btree_gist`) over `TSTZRANGE` preventing overlapping active bookings (`CONFIRMED`, `CONTINGENCY_HOLD`, `MAINTENANCE_BLOCK`).
2. **3-Bucket Inventory Conservation:** Table check constraint `CHECK (physical_on_hand_qty = available_qty + reserved_qty)` backed by an append-only `inventory_movements` tamper guard trigger.
3. **DAG Cycle Prevention:** Recursive reachability check with transaction-scoped advisory locking (`pg_advisory_xact_lock`) raising `SQLSTATE 23514` on circular dependency insertion.
4. **Finite State Machine Enforcement:** Reference matrix `fsm_state_transitions` mapping valid transitions and actor roles, enforced via `trg_work_order_fsm_enforcement`.
5. **Approval Scope Invalidation:** Cryptographic SHA-256 snapshot hashing (`node:category:cost:dept:parts`); any post-approval mutation automatically invalidates the approval record.
6. **Immutable Audit Ledger:** `audit_logs` trigger unconditionally blocking `UPDATE`, `DELETE`, and `TRUNCATE`.

---

## 4. Setup & Running the Verification Suite

### Prerequisites
* Python 3.12+
* PostgreSQL 16 (or Docker with `pgvector/pgvector:pg16`)

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set values for `CAMPUSOPS_ADMIN_PASSWORD`, `CAMPUSOPS_STUDENT_PASSWORD`, and
`CAMPUSOPS_OTHER_DEMO_PASSWORD` before seeding or starting the backend. The current
local setup uses `1234` for Admin and Students at the user's request; the remaining
demo accounts use the third password. Anyone with `1234` can sign in as either persona.
The local `.env` also enables `CAMPUSOPS_ALLOW_ANY_PASSWORD=true` for convenience;
Docker Compose defaults this setting to `false` when it is not configured.

### Starting the Database with Docker
```bash
docker compose up -d postgres
```

### Existing Database: Scoped Noncritical Dispatch
Fresh databases receive the automation role and assignment guard from `backend/migrations/init.sql`.
For an existing database, apply the enum migration separately and commit it before the second file:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/20261031_01_add_ai_automation_role.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/20261031_02_scoped_auto_assignment.sql
```

The automation identity has no password and cannot sign in. Its database guard only permits
`TRIAGED` to `ASSIGNED` for P2/P3 tickets when the assigned technician has the matching skill,
is available, is on shift, and remains within workload limits. P0/P1 work orders stay in Admin
review; tickets without a matching worker stay unassigned and notify Admin.

### Seeding Campus Data
```bash
python scripts/seed_demo.py
```

### Running Phase 1 Invariant Verification
```bash
python scripts/verify_phase1.py
```

