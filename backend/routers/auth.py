from fastapi import APIRouter, Depends, Query

from backend.core.security import require_roles
from backend.services.platform_service import (
    LoginData,
    RegisterData,
    approve_user,
    get_activity_logs,
    get_pending_users,
    login_user,
    register_user,
)

router = APIRouter()


@router.post("/register")
def register(data: RegisterData):
    return register_user(data)


@router.post("/login")
def login(data: LoginData):
    return login_user(data)


@router.get("/pending-users")
def pending_users(user=Depends(require_roles(["admin"]))):
    return get_pending_users()


@router.post("/approve-user/{user_id}")
def approve(user_id: str, user=Depends(require_roles(["admin"]))):
    return approve_user(user_id, user["username"])


@router.get("/admin/activity-logs")
def activity_logs(limit: int = Query(default=20, ge=1, le=100), user=Depends(require_roles(["admin"]))):
    return get_activity_logs(limit)
