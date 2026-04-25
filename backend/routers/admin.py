from fastapi import APIRouter, Depends, Query

from backend.core.security import require_roles
from backend.services.platform_service import (
    CustomerUpdate,
    DriverUpdate,
    StoreCreate,
    StoreUpdate,
    UserCreate,
    create_driver,
    create_store,
    delete_driver,
    delete_store,
    get_admin_stores,
    get_admin_orders,
    get_customers,
    get_drivers,
    get_stats,
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
