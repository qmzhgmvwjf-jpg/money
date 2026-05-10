from fastapi import APIRouter, Depends, Query

from core.security import require_roles
from services.platform_service import (
    AdminDecisionPayload,
    CustomerUpdate,
    DriverUpdate,
    StoreCreate,
    StoreUpdate,
    UserCreate,
    approve_topup_request,
    approve_withdrawal_request,
    create_driver,
    create_store,
    delete_driver,
    delete_store,
    get_finance_overview,
    get_admin_stores,
    get_admin_orders,
    get_customers,
    get_drivers,
    get_stats,
    get_topup_requests,
    get_transactions,
    get_withdrawal_requests,
    reject_topup_request,
    reject_withdrawal_request,
    update_customer,
    update_driver,
    update_store,
)

router = APIRouter()


@router.get("/admin/orders")
def admin_orders(filter: str = Query(default="all"), user=Depends(require_roles(["admin"]))):
    return get_admin_orders(filter)


@router.get("/admin/stores")
def admin_stores(user=Depends(require_roles(["admin"]))):
    return get_admin_stores()


@router.post("/stores")
def post_store(data: StoreCreate, user=Depends(require_roles(["admin"]))):
    return create_store(data)


@router.put("/stores/{store_id}")
def put_store(store_id: str, data: StoreUpdate, user=Depends(require_roles(["admin"]))):
    return update_store(store_id, data, user["username"])


@router.delete("/stores/{store_id}")
def remove_store(store_id: str, user=Depends(require_roles(["admin"]))):
    return delete_store(store_id, user["username"])


@router.get("/drivers")
def drivers(user=Depends(require_roles(["admin"]))):
    return get_drivers()


@router.post("/drivers")
def post_driver(data: UserCreate, user=Depends(require_roles(["admin"]))):
    return create_driver(data)


@router.put("/drivers/{driver_id}")
def put_driver(driver_id: str, data: DriverUpdate, user=Depends(require_roles(["admin"]))):
    return update_driver(driver_id, data)


@router.delete("/drivers/{driver_id}")
def remove_driver(driver_id: str, user=Depends(require_roles(["admin"]))):
    return delete_driver(driver_id, user["username"])


@router.get("/customers")
def customers(user=Depends(require_roles(["admin"]))):
    return get_customers()


@router.put("/customers/{customer_id}")
def put_customer(customer_id: str, data: CustomerUpdate, user=Depends(require_roles(["admin"]))):
    return update_customer(customer_id, data)


@router.get("/stats")
def stats(user=Depends(require_roles(["admin"]))):
    return get_stats()


@router.get("/admin/finance")
def finance(user=Depends(require_roles(["admin"]))):
    return get_finance_overview()


@router.get("/admin/topup-requests")
def topup_requests(status: str | None = Query(default=None), user=Depends(require_roles(["admin"]))):
    return get_topup_requests(status)


@router.post("/admin/topup-requests/{request_id}/approve")
def approve_topup(request_id: str, data: AdminDecisionPayload, user=Depends(require_roles(["admin"]))):
    return approve_topup_request(request_id, user["username"], data.note)


@router.post("/admin/topup-requests/{request_id}/reject")
def reject_topup(request_id: str, data: AdminDecisionPayload, user=Depends(require_roles(["admin"]))):
    return reject_topup_request(request_id, user["username"], data.note)


@router.get("/admin/withdrawal-requests")
def withdrawal_requests(status: str | None = Query(default=None), user=Depends(require_roles(["admin"]))):
    return get_withdrawal_requests(status)


@router.post("/admin/withdrawal-requests/{request_id}/approve")
def approve_withdrawal(request_id: str, data: AdminDecisionPayload, user=Depends(require_roles(["admin"]))):
    return approve_withdrawal_request(request_id, user["username"], data.note)


@router.post("/admin/withdrawal-requests/{request_id}/reject")
def reject_withdrawal(request_id: str, data: AdminDecisionPayload, user=Depends(require_roles(["admin"]))):
    return reject_withdrawal_request(request_id, user["username"], data.note)


@router.get("/admin/transactions")
def transactions(limit: int = Query(default=100, ge=1, le=500), user=Depends(require_roles(["admin"]))):
    return get_transactions(limit)
