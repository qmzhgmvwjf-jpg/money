from fastapi import APIRouter, Depends

from core.security import get_current_user, require_roles
from services.platform_service import (
    Order,
    OrderStatusUpdate,
    admin_delete_order,
    admin_update_status,
    create_order,
    driver_accept,
    driver_complete,
    driver_reject,
    driver_start,
    get_my_orders,
    get_orders_for_role,
    store_accept,
    store_dispatch,
    store_reject,
)

router = APIRouter()


@router.post("/orders")
def post_order(order: Order, user=Depends(require_roles(["customer", "admin"]))):
    return create_order(order, user)


@router.get("/orders")
def orders(user=Depends(get_current_user)):
    return get_orders_for_role(user)


@router.get("/my-orders")
def my_orders(user=Depends(require_roles(["customer", "admin"]))):
    return get_my_orders(user["username"])


@router.put("/orders/{order_id}/status")
def put_status(order_id: str, data: OrderStatusUpdate, user=Depends(require_roles(["admin"]))):
    return admin_update_status(order_id, data, user["username"])


@router.delete("/orders/{order_id}")
def delete_order(order_id: str, user=Depends(require_roles(["admin"]))):
    return admin_delete_order(order_id, user["username"])


@router.post("/orders/{order_id}/store_accept")
def order_store_accept(order_id: str, user=Depends(require_roles(["store"]))):
    return store_accept(order_id, user)


@router.post("/orders/{order_id}/reject")
def order_store_reject(order_id: str, user=Depends(require_roles(["store"]))):
    return store_reject(order_id, user)


@router.post("/orders/{order_id}/dispatch")
def order_dispatch(order_id: str, user=Depends(require_roles(["store"]))):
    return store_dispatch(order_id, user)


@router.post("/orders/{order_id}/accept")
def order_driver_accept(order_id: str, user=Depends(require_roles(["driver"]))):
    return driver_accept(order_id, user)


@router.post("/orders/{order_id}/driver-reject")
def order_driver_reject(order_id: str, user=Depends(require_roles(["driver"]))):
    return driver_reject(order_id, user)


@router.post("/orders/{order_id}/start")
def order_driver_start(order_id: str, user=Depends(require_roles(["driver"]))):
    return driver_start(order_id, user)


@router.post("/orders/{order_id}/complete")
def order_driver_complete(order_id: str, user=Depends(require_roles(["driver"]))):
    return driver_complete(order_id, user)
