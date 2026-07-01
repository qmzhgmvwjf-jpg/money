from fastapi import APIRouter, Depends, Query

from core.security import require_roles
from services.platform_service import (
    CustomerUpdate,
    LoginData,
    RegisterData,
    approve_user,
    claim_daily_lucky_box,
    get_activity_logs,
    get_pending_users,
    get_customer_retention_summary,
    get_followed_stores,
    get_sticker_book,
    get_available_rewards,
    get_self_profile,
    login_user,
    register_user,
    update_self_customer_profile,
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


@router.get("/me")
def my_profile(user=Depends(require_roles(["customer"]))):
    return get_self_profile(user)


@router.put("/me")
def put_my_profile(data: CustomerUpdate, user=Depends(require_roles(["customer"]))):
    return update_self_customer_profile(user, data)


@router.get("/me/retention")
def my_retention(user=Depends(require_roles(["customer"]))):
    return get_customer_retention_summary(user)


@router.get("/me/sticker-book")
def my_sticker_book(user=Depends(require_roles(["customer"]))):
    return get_sticker_book(user["username"])


@router.get("/me/rewards")
def my_rewards(user=Depends(require_roles(["customer"]))):
    return get_available_rewards(user["username"])


@router.get("/me/follows")
def my_follows(user=Depends(require_roles(["customer"]))):
    return get_followed_stores(user["username"])


@router.post("/me/lucky-box/claim")
def post_lucky_box(user=Depends(require_roles(["customer"]))):
    return claim_daily_lucky_box(user)
