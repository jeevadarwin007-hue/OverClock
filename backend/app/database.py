import asyncpg
from typing import Optional, AsyncGenerator
from contextlib import asynccontextmanager
from uuid import UUID
from app.config import settings

_db_pool: Optional[asyncpg.Pool] = None


async def init_db_pool() -> asyncpg.Pool:
    global _db_pool
    if _db_pool is None:
        if settings.CAMPUSOPS_OTHER_DEMO_PASSWORD and settings.CAMPUSOPS_OTHER_DEMO_PASSWORD in {
            settings.CAMPUSOPS_ADMIN_PASSWORD,
            settings.CAMPUSOPS_STUDENT_PASSWORD,
        }:
            raise ValueError("CAMPUSOPS_OTHER_DEMO_PASSWORD must be distinct from Admin and Student passwords.")
        try:
            _db_pool = await asyncpg.create_pool(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                database=settings.POSTGRES_DB,
                min_size=5,
                max_size=30,
                command_timeout=60,
            )
            async with _db_pool.acquire() as conn:
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INT NOT NULL DEFAULT 1;")

                # Environment credentials are the source of truth for seeded demo identities.
                configured_credentials = [
                    ("sys_admin_1@easwari.edu", settings.CAMPUSOPS_ADMIN_PASSWORD),
                    ("student_1@easwari.edu", settings.CAMPUSOPS_STUDENT_PASSWORD),
                ]
                if settings.CAMPUSOPS_OTHER_DEMO_PASSWORD:
                    other_password_hash = _hash_password(settings.CAMPUSOPS_OTHER_DEMO_PASSWORD)
                    await conn.execute(
                        """
                        UPDATE users SET password_hash = $1
                        WHERE email = ANY($2::text[]);
                        """,
                        other_password_hash,
                        [
                            "tech_elec_1@easwari.edu",
                            "tech_net_1@easwari.edu",
                            "tech_net_2@easwari.edu",
                            "mgr_acad@easwari.edu",
                            "mgr_facilities@easwari.edu",
                            "procurement_approver_1@easwari.edu",
                        ],
                    )

                for email, password in configured_credentials:
                    if password:
                        await conn.execute(
                            "UPDATE users SET password_hash = $1 WHERE email = $2;",
                            _hash_password(password),
                            email,
                        )
        except Exception:
            _db_pool = None
            raise
    return _db_pool


def _hash_password(password: str) -> str:
    from app.core.security import hash_password

    return hash_password(password)


async def close_db_pool() -> None:
    global _db_pool
    if _db_pool is not None:
        try:
            await _db_pool.close()
        except Exception:
            pass
        _db_pool = None


def get_db_pool() -> asyncpg.Pool:
    if _db_pool is None:
        raise RuntimeError("Database connection pool is not initialized.")
    return _db_pool


@asynccontextmanager
async def acquire_db_connection(
    actor_id: Optional[UUID] = None,
    actor_role: Optional[str] = None,
    dept_id: Optional[UUID] = None,
) -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Acquires an asyncpg connection from the pool and establishes the
    secure transaction context (set_secure_context) for role and SoD enforcement.
    """
    global _db_pool
    if _db_pool is None:
        try:
            await init_db_pool()
        except Exception:
            raise RuntimeError("Database connection pool is not initialized or PostgreSQL is offline.")

    pool = get_db_pool()
    async with pool.acquire() as conn:
        if actor_id is not None and actor_role is not None:
            await conn.execute(
                """
                SELECT set_secure_context($1::uuid, $2::user_role, $3::uuid);
                """,
                actor_id,
                actor_role,
                dept_id,
            )
        try:
            yield conn
        finally:
            # Context remains bound to backend_pid and is cleanly overwritten on next acquire
            pass

