from fastapi import APIRouter, Depends, Query

from core.security import require_roles
from services.platform_service import (
    ContentPostCreate,
    ContentPostUpdate,
    StoreSettingsUpdate,
    StoreTopupRequestCreate,
    StoreWithdrawalRequestCreate,
    StoreTimeUpdate,
    ToggleAutoAcceptPayload,
    ToggleOpenPayload,
    create_store_content_post,
    delete_store_content_post,
    get_personalized_feed,
    get_public_stores,
    get_store_content_posts,
    get_store_finance,
    get_store_my_info,
    get_store_orders,
    get_store_stats,
    request_store_topup,
    request_store_withdrawal,
    set_store_time,
    toggle_store_auto_accept,
    toggle_store_open,
    update_store_content_post,
    update_store_settings,
)

router = APIRouter()


@router.get("/stores")
def public_stores():
    return get_public_stores()


@router.get("/feed")
def feed(user=Depends(require_roles(["customer", "admin"]))):
    return get_personalized_feed(user)


@router.get("/store/orders")
def store_orders(filter: str = Query(default="all"), user=Depends(require_roles(["store"]))):
    return get_store_orders(user, filter)


@router.get("/store/stats")
def store_stats(user=Depends(require_roles(["store"]))):
    return get_store_stats(user)


@router.get("/store/my-info")
def store_my_info(user=Depends(require_roles(["store"]))):
    return get_store_my_info(user)


@router.put("/store/settings")
def store_settings(data: StoreSettingsUpdate, user=Depends(require_roles(["store"]))):
    return update_store_settings(user, data)


@router.put("/store/toggle-open")
def store_toggle_open(data: ToggleOpenPayload, user=Depends(require_roles(["store"]))):
    return toggle_store_open(user, data.isOpen)


@router.put("/store/set-time")
def store_set_time(data: StoreTimeUpdate, user=Depends(require_roles(["store"]))):
    return set_store_time(user, data.openTime, data.closeTime)


@router.put("/store/toggle-auto-accept")
def store_toggle_auto_accept(
    data: ToggleAutoAcceptPayload,
    user=Depends(require_roles(["store"])),
):
    return toggle_store_auto_accept(user, data.autoAccept)


@router.get("/store/finance")
def store_finance(user=Depends(require_roles(["store"]))):
    return get_store_finance(user)


@router.post("/store/topup-requests")
def store_topup_request(data: StoreTopupRequestCreate, user=Depends(require_roles(["store"]))):
    return request_store_topup(user, data)


@router.post("/store/withdrawal-requests")
def store_withdrawal_request(data: StoreWithdrawalRequestCreate, user=Depends(require_roles(["store"]))):
    return request_store_withdrawal(user, data)


@router.get("/store/content-posts")
def store_content_posts(user=Depends(require_roles(["store"]))):
    return get_store_content_posts(user)


@router.post("/store/content-posts")
def create_content_post(data: ContentPostCreate, user=Depends(require_roles(["store"]))):
    return create_store_content_post(user, data)


@router.put("/store/content-posts/{post_id}")
def update_content_post(post_id: str, data: ContentPostUpdate, user=Depends(require_roles(["store"]))):
    return update_store_content_post(post_id, user, data)


@router.delete("/store/content-posts/{post_id}")
def delete_content_post(post_id: str, user=Depends(require_roles(["store"]))):
    return delete_store_content_post(post_id, user)
