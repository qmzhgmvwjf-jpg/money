from fastapi import APIRouter, Depends, Query

from core.security import require_roles
from services.platform_service import (
    DriverOnlineUpdate,
    get_driver_available_orders,
    get_driver_dashboard,
    get_driver_earnings,
    get_driver_history,
    update_driver_online_status,
)

router = APIRouter()


@router.put("/driver/online-status")
def online_status(data: DriverOnlineUpdate, user=Depends(require_roles(["driver"]))):
    return update_driver_online_status(user, data)


@router.get("/driver/dashboard")
def dashboard(user=Depends(require_roles(["driver"]))):
    return get_driver_dashboard(user)


@router.get("/driver/available-orders")
def available_orders(user=Depends(require_roles(["driver"]))):
    return get_driver_available_orders(user)


@router.get("/driver/history")
def history(period: str = Query(default="day"), user=Depends(require_roles(["driver"]))):
    return get_driver_history(user, period)


@router.get("/driver/earnings")
def earnings(period: str = Query(default="day"), user=Depends(require_roles(["driver"]))):
    return get_driver_earnings(user, period)
