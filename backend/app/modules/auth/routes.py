from uuid import UUID
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.database import acquire_db_connection
from app.core.security import create_access_token, verify_password
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    email: str
    role: str
    full_name: str


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    async with acquire_db_connection() as conn:
        user = await conn.fetchrow(
            """
            SELECT id, email, full_name, role, department_id, password_hash, auth_version
            FROM users
            WHERE email = $1;
            """,
            request.email
        )
        if not user or user["role"] == "AI_AUTOMATION" or (
            not settings.CAMPUSOPS_ALLOW_ANY_PASSWORD
            and (not user["password_hash"] or not verify_password(request.password, user["password_hash"]))
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        token = create_access_token(
            data={
                "sub": str(user["id"]),
                "role": user["role"],
                "email": user["email"],
                "auth_version": user["auth_version"],
            }
        )

        return TokenResponse(
            access_token=token,
            user_id=user["id"],
            email=user["email"],
            role=user["role"],
            full_name=user["full_name"]
        )

