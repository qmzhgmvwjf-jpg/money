from fastapi import APIRouter, Depends

from core.security import get_current_user, require_roles
from services.platform_service import (
    NoticeCreate,
    NoticeUpdate,
    create_notice,
    delete_notice,
    get_notices_for_role,
    read_notice,
    update_notice,
)

router = APIRouter()


@router.post("/notices")
def post_notice(data: NoticeCreate, user=Depends(require_roles(["admin"]))):
    return create_notice(data, user["username"])


@router.get("/notices")
def notices(user=Depends(get_current_user)):
    return get_notices_for_role(user["role"])


@router.put("/notices/{notice_id}")
def put_notice(notice_id: str, data: NoticeUpdate, user=Depends(require_roles(["admin"]))):
    return update_notice(notice_id, data, user["username"])


@router.delete("/notices/{notice_id}")
def remove_notice(notice_id: str, user=Depends(require_roles(["admin"]))):
    return delete_notice(notice_id, user["username"])


@router.put("/notices/{notice_id}/read")
def notice_read(notice_id: str, user=Depends(get_current_user)):
    return read_notice(notice_id, user["username"])
