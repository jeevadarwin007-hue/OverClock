import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db_pool, close_db_pool
from app.core.exceptions import CampusOpsException
from app.workers.outbox_worker import run_outbox_loop
from app.modules.auth.routes import router as auth_router
from app.modules.work_orders.routes import router as work_orders_router
from app.modules.inventory.routes import router as inventory_router
from app.modules.staffing.routes import router as staffing_router
from app.modules.intake.routes import router as intake_router
from app.modules.analytics.routes import router as analytics_router
from app.modules.scheduling.routes import router as scheduling_router
from app.modules.simulation.routes import router as simulation_router
from app.modules.approvals.routes import router as approvals_router
from app.modules.campus.routes import router as campus_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("campusops")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CampusOps database pool...")
    await init_db_pool()

    # Synchronize FSM state transitions for Admin Approval and Resolution workflows
    try:
        from app.database import acquire_db_connection
        async with acquire_db_connection(actor_id=None, actor_role="SYS_ADMIN", dept_id=None) as conn:
            await conn.execute("""
                INSERT INTO fsm_state_transitions (from_state, to_state, allowed_roles)
                VALUES 
                    ('ASSIGNED', 'RESOLVED', ARRAY['TECHNICIAN'::user_role, 'SYS_ADMIN'::user_role, 'FACILITIES_ADMIN'::user_role]),
                    ('TRIAGED', 'RESOLVED', ARRAY['SYS_ADMIN'::user_role, 'FACILITIES_ADMIN'::user_role]),
                    ('AWAITING_CLARIFICATION', 'RESOLVED', ARRAY['SYS_ADMIN'::user_role, 'FACILITIES_ADMIN'::user_role]),
                    ('INGESTED', 'ASSIGNED', ARRAY['SYS_ADMIN'::user_role, 'FACILITIES_ADMIN'::user_role, 'DEPT_MANAGER'::user_role]),
                    ('AWAITING_CLARIFICATION', 'ASSIGNED', ARRAY['SYS_ADMIN'::user_role, 'FACILITIES_ADMIN'::user_role, 'DEPT_MANAGER'::user_role]),
                    ('IN_PROGRESS', 'RESOLVED', ARRAY['TECHNICIAN'::user_role, 'SYS_ADMIN'::user_role, 'FACILITIES_ADMIN'::user_role])
                ON CONFLICT (from_state, to_state) DO UPDATE
                SET allowed_roles = EXCLUDED.allowed_roles;
            """)
            logger.info("FSM state transitions successfully verified and synchronized.")

            # Synchronize workforce technician specializations across all trades
            from app.modules.staffing.service import StaffingService
            await StaffingService.ensure_seed_technicians(conn)
            logger.info("Campus maintenance workforce & trade specializations synchronized.")
    except Exception as e:
        logger.warning(f"Could not synchronize FSM transitions or technicians at startup: {e}")

    logger.info("Starting background outbox worker...")
    stop_event = asyncio.Event()
    outbox_task = asyncio.create_task(
        run_outbox_loop(poll_interval=settings.OUTBOX_WORKER_POLL_INTERVAL, stop_event=stop_event)
    )

    yield

    logger.info("Stopping background outbox worker...")
    stop_event.set()
    outbox_task.cancel()
    try:
        await outbox_task
    except asyncio.CancelledError:
        pass

    logger.info("Closing database pool...")
    await close_db_pool()


app = FastAPI(
    title="CampusOps API: SRM Easwari Engineering College",
    description="Intelligent Campus Operations & Consequence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Structured Error Handlers
@app.exception_handler(CampusOpsException)
async def campusops_exception_handler(request: Request, exc: CampusOpsException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details,
            "path": request.url.path,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected server error occurred.",
            "path": request.url.path,
        },
    )


# Mount Sub-routers
api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth_router)
api_v1.include_router(work_orders_router)
api_v1.include_router(inventory_router)
api_v1.include_router(staffing_router)
api_v1.include_router(intake_router)
api_v1.include_router(analytics_router)
api_v1.include_router(scheduling_router)
api_v1.include_router(simulation_router)
api_v1.include_router(approvals_router)
api_v1.include_router(campus_router)

app.include_router(api_v1)


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    db_connected = False
    try:
        from app.database import acquire_db_connection
        async with acquire_db_connection(actor_id=None, actor_role="SYS_ADMIN", dept_id=None) as conn:
            val = await conn.fetchval("SELECT 1;")
            db_connected = (val == 1)
    except Exception:
        db_connected = False

    groq_connected = bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 10)
    network_connected = True

    return {
        "status": "healthy" if db_connected else "degraded",
        "campus": settings.CAMPUS_NAME,
        "campus_code": settings.CAMPUS_CODE,
        "coordinates": {"lat": settings.CAMPUS_LAT, "lon": settings.CAMPUS_LON},
        "connections": {
            "database": {
                "name": "Database",
                "service": "PostgreSQL 16",
                "connected": db_connected,
                "label": "DATABASE",
            },
            "network": {
                "name": "Network",
                "service": "Campus Core API",
                "connected": network_connected,
                "label": "NETWORK",
            },
            "groq": {
                "name": "Groq AI",
                "service": settings.GROQ_MODEL,
                "connected": groq_connected,
                "label": "GROQ",
            },
            "uptime": {
                "name": "System Uptime",
                "service": "Mathematical Invariants",
                "connected": True,
                "label": "UPTIME",
            },
        },
    }

