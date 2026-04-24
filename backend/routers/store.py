from fastapi import APIRouter, Depends, Query

from backend.core.security import require_roles
from backend.services.platform_service import get_store_orders, get_store_stats

router = APIRouter()


@router.get("/store/orders")
def store_orders(filter: str = Query(default="all"), user=Depends(require_roles(["store"]))):
    return get_store_orders(user, filter)


@router.get("/store/stats")
def store_stats(user=Depends(require_roles(["store"]))):
    return get_store_stats(user)
