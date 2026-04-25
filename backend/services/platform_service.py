from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from bson import ObjectId
from fastapi import HTTPException
from jose import jwt
from pydantic import BaseModel

from core.config import (
    ADMIN_ORDER_FILTERS,
    ALL_ROLES,
    ALGORITHM,
    DRIVER_FEE_RATE,
    DRIVER_ONLINE_STATUSES,
    NOTICE_TARGETS,
    ORDER_STATUSES,
    REGISTER_ROLES,
    SECRET_KEY,
    STATUS_TO_KOREAN,
    STORE_ORDER_FILTERS,
)
from core.database import db


class LoginData(BaseModel):
    username: str
    password: str


class RegisterData(BaseModel):
    username: str
    password: str
    phone: str
    role: str
    storeName: str | None = None


class UserCreate(BaseModel):
    username: str
    password: str
    phone: str


class StoreCreate(UserCreate):
    name: str
    openTime: str = "09:00"
    closeTime: str = "21:00"


class StoreUpdate(BaseModel):
    name: str | None = None
    isOpen: bool | None = None
    openTime: str | None = None
    closeTime: str | None = None
    approved: bool | None = None
    autoAccept: bool | None = None


class StoreTimeUpdate(BaseModel):
    openTime: str
    closeTime: str


class ToggleOpenPayload(BaseModel):
    isOpen: bool


class ToggleAutoAcceptPayload(BaseModel):
    autoAccept: bool


class DriverUpdate(BaseModel):
    phone: str | None = None
    onlineStatus: str | None = None


class CustomerUpdate(BaseModel):
    phone: str | None = None
    address: str | None = None


class Order(BaseModel):
    store_id: str
    address: str | None = None
    items: list[dict[str, Any]] | None = None


class Menu(BaseModel):
    store_id: str
    name: str
    price: int


class OrderStatusUpdate(BaseModel):
    status: str


class NoticeCreate(BaseModel):
    title: str
    content: str
    target: str


class NoticeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    target: str | None = None


class DriverOnlineUpdate(BaseModel):
    onlineStatus: str


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value: datetime | None) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def object_id_or_400(value: str, label: str = "id") -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")
    return ObjectId(value)


def get_user_by_username(username: str):
    return db.users.find_one({"username": username})


def get_user_or_404(user_id: str):
    user = db.users.find_one({"_id": object_id_or_400(user_id, "user id")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_store_or_404(store_id: str):
    store = db.stores.find_one({"_id": object_id_or_400(store_id, "store id")})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


def get_store_by_owner(owner: str):
    return db.stores.find_one({"owner": owner})


def get_order_or_404(order_id: str):
    order = db.orders.find_one({"_id": object_id_or_400(order_id, "order id")})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def get_notice_or_404(notice_id: str):
    notice = db.notices.find_one({"_id": object_id_or_400(notice_id, "notice id")})
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    return notice


def build_order_id() -> str:
    return f"ORD-{now_utc().strftime('%Y%m%d%H%M%S%f')}"


def is_today(value: datetime | None) -> bool:
    if not value:
        return False
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).date() == now_utc().date()


def get_start_date(period: str) -> datetime:
    if period == "day":
        return now_utc() - timedelta(days=1)
    if period == "week":
        return now_utc() - timedelta(days=7)
    if period == "month":
        return now_utc() - timedelta(days=30)
    raise HTTPException(status_code=400, detail="유효하지 않은 기간입니다.")


def calc_total_price(items: list[dict[str, Any]] | None) -> int:
    return int(sum(int(item.get("price", 0)) for item in (items or [])))


def calc_driver_fee(total_price: int) -> int:
    return int(total_price * DRIVER_FEE_RATE)


def status_log_entry(status: str, actor: str, message: str | None = None) -> dict:
    return {
        "status": status,
        "status_label": STATUS_TO_KOREAN.get(status, status),
        "actor": actor,
        "message": message or STATUS_TO_KOREAN.get(status, status),
        "created_at": now_utc(),
    }


def create_activity_log(actor: str, role: str, action: str, message: str):
    db.activity_logs.insert_one(
        {
            "actor": actor,
            "role": role,
            "action": action,
            "message": message,
            "created_at": now_utc(),
        }
    )


def parse_clock(value: str):
    hour, minute = value.split(":")
    return int(hour), int(minute)


def is_store_open_now(store: dict) -> bool:
    if not store.get("approved", False):
        return False
    if not store.get("isOpen", False):
        return False

    now_local = now_utc().astimezone(timezone(timedelta(hours=9)))
    current_minutes = now_local.hour * 60 + now_local.minute
    open_hour, open_minute = parse_clock(store.get("openTime", "09:00"))
    close_hour, close_minute = parse_clock(store.get("closeTime", "21:00"))
    open_minutes = open_hour * 60 + open_minute
    close_minutes = close_hour * 60 + close_minute

    if open_minutes <= close_minutes:
        return open_minutes <= current_minutes < close_minutes

    return current_minutes >= open_minutes or current_minutes < close_minutes


def serialize_store(store: dict, include_internal: bool = False) -> dict:
    base = {
        "_id": str(store["_id"]),
        "name": store.get("name"),
        "owner": store.get("owner"),
        "isOpen": store.get("isOpen", False),
        "openTime": store.get("openTime"),
        "closeTime": store.get("closeTime"),
        "approved": store.get("approved", False),
        "autoAccept": store.get("autoAccept", False),
        "currentlyOpen": is_store_open_now(store),
        "created_at": to_iso(store.get("created_at")),
    }
    if include_internal:
        base["ownerUserId"] = str(store.get("ownerUserId")) if store.get("ownerUserId") else None
    return base


def serialize_order(order: dict) -> dict:
    store = db.stores.find_one({"_id": order.get("store_id")}) if order.get("store_id") else None
    return {
        "_id": str(order["_id"]),
        "order_id": order.get("order_id"),
        "store_id": str(order.get("store_id")) if order.get("store_id") else None,
        "store": store.get("name") if store else order.get("store_name"),
        "store_name": store.get("name") if store else order.get("store_name"),
        "address": order.get("address"),
        "items": order.get("items", []),
        "user": order.get("user"),
        "customer_name": order.get("customer_name"),
        "phone": order.get("phone"),
        "total_price": order.get("total_price", 0),
        "status": order.get("status"),
        "driver_id": order.get("driver_id"),
        "driver_fee": order.get("driver_fee", 0),
        "created_at": to_iso(order.get("created_at")),
        "status_logs": [
            {**log, "created_at": to_iso(log.get("created_at"))}
            for log in order.get("status_logs", [])
        ],
    }


def serialize_menu(menu: dict) -> dict:
    store = db.stores.find_one({"_id": menu.get("store_id")}) if menu.get("store_id") else None
    return {
        "_id": str(menu["_id"]),
        "store_id": str(menu.get("store_id")) if menu.get("store_id") else None,
        "store_name": store.get("name") if store else menu.get("store_name"),
        "name": menu.get("name"),
        "price": menu.get("price"),
    }


def serialize_user(user: dict) -> dict:
    store = get_store_by_owner(user.get("username")) if user.get("role") == "store" else None
    return {
        "_id": str(user["_id"]),
        "username": user.get("username"),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "approved": user.get("approved", False),
        "address": user.get("address"),
        "onlineStatus": user.get("onlineStatus", "offline"),
        "created_at": to_iso(user.get("created_at")),
        "last_active_at": to_iso(user.get("last_active_at")),
        "store": serialize_store(store) if store else None,
    }


def serialize_notice(notice: dict) -> dict:
    return {
        "_id": str(notice["_id"]),
        "title": notice.get("title"),
        "content": notice.get("content"),
        "target": notice.get("target"),
        "created_at": to_iso(notice.get("created_at")),
        "created_by": notice.get("created_by"),
        "read_by": notice.get("read_by", []),
    }


def serialize_activity(log: dict) -> dict:
    return {
        "_id": str(log["_id"]),
        "actor": log.get("actor"),
        "role": log.get("role"),
        "action": log.get("action"),
        "message": log.get("message"),
        "created_at": to_iso(log.get("created_at")),
    }


def ensure_default_admin():
    if db.users.find_one({"username": "admin"}):
        return

    db.users.insert_one(
        {
            "username": "admin",
            "password": hash_password("1234"),
            "phone": "010-0000-0000",
            "role": "admin",
            "approved": True,
            "address": None,
            "onlineStatus": None,
            "created_at": now_utc(),
            "last_active_at": now_utc(),
        }
    )


def create_user(username: str, password: str, phone: str, role: str, **extra):
    username = username.strip()
    phone = phone.strip()

    if not username or not password.strip() or not phone:
        raise HTTPException(status_code=400, detail="필수 항목을 입력하세요.")
    if role not in ALL_ROLES:
        raise HTTPException(status_code=400, detail="유효하지 않은 역할입니다.")
    if get_user_by_username(username):
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")

    user = {
        "username": username,
        "password": hash_password(password),
        "phone": phone,
        "role": role,
        "approved": extra.pop("approved", True),
        "address": extra.pop("address", None),
        "onlineStatus": extra.pop("onlineStatus", "offline" if role == "driver" else None),
        "created_at": now_utc(),
        "last_active_at": now_utc(),
    }
    user.update(extra)

    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id
    create_activity_log(username, role, "create_user", f"{role} 계정 생성")
    return user


def create_store_document(
    name: str,
    owner: str,
    owner_user_id: ObjectId,
    approved: bool,
    is_open: bool = True,
    open_time: str = "09:00",
    close_time: str = "21:00",
    auto_accept: bool = False,
):
    store_doc = {
        "name": name.strip(),
        "owner": owner,
        "ownerUserId": owner_user_id,
        "isOpen": is_open,
        "openTime": open_time,
        "closeTime": close_time,
        "approved": approved,
        "autoAccept": auto_accept,
        "created_at": now_utc(),
    }
    result = db.stores.insert_one(store_doc)
    store_doc["_id"] = result.inserted_id
    return store_doc


def register_user(data: RegisterData):
    role = data.role.strip()

    if role not in REGISTER_ROLES:
        raise HTTPException(status_code=400, detail="유효하지 않은 역할입니다.")

    approved = role == "customer"
    user = create_user(
        username=data.username,
        password=data.password,
        phone=data.phone,
        role=role,
        approved=approved,
    )

    if role == "store":
        if not data.storeName or not data.storeName.strip():
            raise HTTPException(status_code=400, detail="가게명 입력이 필요합니다.")
        create_store_document(
            name=data.storeName,
            owner=user["username"],
            owner_user_id=user["_id"],
            approved=False,
            is_open=True,
        )

    return {"message": "회원가입 완료", "approved": approved}


def login_user(data: LoginData):
    user = get_user_by_username(data.username.strip())

    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("approved", False):
        raise HTTPException(status_code=403, detail="승인 대기 중인 계정입니다.")

    store = get_store_by_owner(user["username"]) if user.get("role") == "store" else None
    if user.get("role") == "store" and (not store or not store.get("approved", False)):
        raise HTTPException(status_code=403, detail="승인 대기 중인 가게입니다.")

    token = jwt.encode(
        {"username": user["username"], "role": user["role"]},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    create_activity_log(user["username"], user["role"], "login", "로그인")

    return {
        "token": token,
        "role": user["role"],
        "username": user["username"],
        "phone": user.get("phone"),
        "address": user.get("address"),
        "onlineStatus": user.get("onlineStatus"),
        "storeName": store.get("name") if store else None,
        "storeId": str(store["_id"]) if store else None,
    }


def get_pending_users():
    return [
        serialize_user(item)
        for item in db.users.find(
            {"approved": False, "role": {"$in": ["store", "driver"]}}
        ).sort("created_at", -1)
    ]


def approve_user(user_id: str, actor: str):
    target_user = get_user_or_404(user_id)
    db.users.update_one({"_id": target_user["_id"]}, {"$set": {"approved": True}})

    if target_user.get("role") == "store":
        store = get_store_by_owner(target_user["username"])
        if store:
            db.stores.update_one({"_id": store["_id"]}, {"$set": {"approved": True}})

    create_activity_log(actor, "admin", "approve_user", f"{target_user['username']} 승인")
    return {"message": "approved"}


def get_activity_logs(limit: int):
    return [
        serialize_activity(log)
        for log in db.activity_logs.find().sort("created_at", -1).limit(limit)
    ]


def get_public_stores():
    stores = list(db.stores.find({"approved": True}).sort("created_at", -1))
    return [serialize_store(store) for store in stores]


def get_admin_stores():
    stores = []

    for store in db.stores.find().sort("created_at", -1):
        store_data = serialize_store(store, include_internal=True)
        owner_user = get_user_by_username(store.get("owner"))
        menus = list(db.menus.find({"store_id": store["_id"]}).sort("name", 1))
        orders = list(db.orders.find({"store_id": store["_id"]}).sort("created_at", -1))
        completed_orders = [order for order in orders if order.get("status") == "completed"]

        store_data["ownerPhone"] = owner_user.get("phone") if owner_user else None
        store_data["menus"] = [serialize_menu(menu) for menu in menus]
        store_data["orders"] = [serialize_order(order) for order in orders]
        store_data["sales"] = sum(order.get("total_price", 0) for order in completed_orders)
        store_data["orderCount"] = len(orders)
        stores.append(store_data)

    return stores


def create_store(data: StoreCreate):
    user = create_user(
        username=data.username,
        password=data.password,
        phone=data.phone,
        role="store",
        approved=True,
    )
    store = create_store_document(
        name=data.name,
        owner=user["username"],
        owner_user_id=user["_id"],
        approved=True,
        open_time=data.openTime,
        close_time=data.closeTime,
    )
    return {
        **serialize_store(store, include_internal=True),
        "ownerPhone": user.get("phone"),
        "menus": [],
        "orders": [],
        "sales": 0,
        "orderCount": 0,
    }


def update_store(store_id: str, data: StoreUpdate, actor: str):
    store = get_store_or_404(store_id)
    update_data = {}

    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(status_code=400, detail="가게명을 입력하세요.")
        update_data["name"] = data.name.strip()
    if data.isOpen is not None:
        update_data["isOpen"] = data.isOpen
    if data.openTime is not None:
        update_data["openTime"] = data.openTime
    if data.closeTime is not None:
        update_data["closeTime"] = data.closeTime
    if data.approved is not None:
        update_data["approved"] = data.approved
        owner_user = get_user_by_username(store.get("owner"))
        if owner_user:
            db.users.update_one({"_id": owner_user["_id"]}, {"$set": {"approved": data.approved}})
    if data.autoAccept is not None:
        update_data["autoAccept"] = data.autoAccept

    if update_data:
        db.stores.update_one({"_id": store["_id"]}, {"$set": update_data})

    create_activity_log(actor, "admin", "update_store", f"{store.get('name')} 정보 수정")
    return serialize_store(db.stores.find_one({"_id": store["_id"]}), include_internal=True)


def delete_store(store_id: str, actor: str):
    store = get_store_or_404(store_id)
    owner_user = get_user_by_username(store.get("owner"))

    db.stores.delete_one({"_id": store["_id"]})
    db.menus.delete_many({"store_id": store["_id"]})
    if owner_user:
        db.users.delete_one({"_id": owner_user["_id"]})

    create_activity_log(actor, "admin", "delete_store", f"{store.get('name')} 삭제")
    return {"ok": True}


def get_menu_list(store_id: str | None = None):
    query = {}

    if store_id:
        query["store_id"] = object_id_or_400(store_id, "store id")
    else:
        visible_store_ids = [
            store["_id"]
            for store in db.stores.find({"approved": True})
            if is_store_open_now(store)
        ]
        query["store_id"] = {"$in": visible_store_ids}

    return [serialize_menu(menu) for menu in db.menus.find(query).sort("name", 1)]


def create_menu(menu: Menu, actor: dict):
    store = get_store_or_404(menu.store_id)

    if actor["role"] == "store" and store.get("owner") != actor["username"]:
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 등록할 수 있습니다.")

    menu_doc = {
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "name": menu.name,
        "price": menu.price,
        "created_at": now_utc(),
    }
    result = db.menus.insert_one(menu_doc)
    menu_doc["_id"] = result.inserted_id

    create_activity_log(actor["username"], actor["role"], "create_menu", f"{store.get('name')} 메뉴 등록: {menu.name}")
    return serialize_menu(menu_doc)


def update_menu(menu_id: str, data: dict, actor: dict):
    menu = db.menus.find_one({"_id": object_id_or_400(menu_id, "menu id")})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")

    store = get_store_or_404(str(menu.get("store_id")))
    if actor["role"] == "store" and store.get("owner") != actor["username"]:
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 수정할 수 있습니다.")

    update_data = {}
    if "name" in data:
        update_data["name"] = data["name"]
    if "price" in data:
        update_data["price"] = data["price"]

    db.menus.update_one({"_id": menu["_id"]}, {"$set": update_data})
    create_activity_log(actor["username"], actor["role"], "update_menu", f"{store.get('name')} 메뉴 수정")
    return {"ok": True}


def delete_menu(menu_id: str, actor: dict):
    menu = db.menus.find_one({"_id": object_id_or_400(menu_id, "menu id")})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")

    store = get_store_or_404(str(menu.get("store_id")))
    if actor["role"] == "store" and store.get("owner") != actor["username"]:
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 삭제할 수 있습니다.")

    db.menus.delete_one({"_id": menu["_id"]})
    create_activity_log(actor["username"], actor["role"], "delete_menu", f"{store.get('name')} 메뉴 삭제")
    return {"ok": True}


def get_store_current_order_count(store_id: ObjectId) -> int:
    return db.orders.count_documents(
        {
            "store_id": store_id,
            "status": {"$in": ["pending", "accepted", "dispatch_ready", "assigned", "delivering"]},
        }
    )


def create_order(order: Order, actor: dict):
    store = get_store_or_404(order.store_id)

    if not store.get("approved", False):
        raise HTTPException(status_code=400, detail="승인된 가게만 주문할 수 있습니다.")
    if not is_store_open_now(store):
        raise HTTPException(status_code=400, detail="현재 주문할 수 없는 가게입니다.")

    items = order.items or []
    address = order.address or actor.get("address")
    total_price = calc_total_price(items)
    initial_status = "accepted" if store.get("autoAccept", False) else "pending"
    initial_message = "주문 생성"
    if initial_status == "accepted":
        initial_message = "자동 수락 처리된 주문"

    if address:
        db.users.update_one({"username": actor["username"]}, {"$set": {"address": address}})

    order_doc = {
        "order_id": build_order_id(),
        "created_at": now_utc(),
        "customer_name": actor["username"],
        "user": actor["username"],
        "phone": actor.get("phone"),
        "address": address,
        "items": items,
        "total_price": total_price,
        "status": initial_status,
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "driver_id": None,
        "driver_fee": calc_driver_fee(total_price),
        "status_logs": [status_log_entry(initial_status, actor["username"], initial_message)],
        "rejected_drivers": [],
    }
    result = db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id

    create_activity_log(actor["username"], actor["role"], "create_order", f"{order_doc['order_id']} 주문 생성")
    return {"message": "ok", "order": serialize_order(order_doc)}


def get_orders_for_role(actor: dict):
    if actor["role"] == "admin":
        query = {}
    elif actor["role"] == "store":
        store = get_store_by_owner(actor["username"])
        query = {"store_id": store["_id"]} if store else {"_id": None}
    elif actor["role"] == "driver":
        query = {
            "$or": [
                {"status": "dispatch_ready", "rejected_drivers": {"$ne": actor["username"]}},
                {"driver_id": actor["username"]},
            ]
        }
    else:
        query = {"user": actor["username"]}

    return [serialize_order(order) for order in db.orders.find(query).sort("created_at", -1)]


def get_my_orders(username: str):
    return [serialize_order(order) for order in db.orders.find({"user": username}).sort("created_at", -1)]


def append_order_status(order: dict, status: str, actor: str, message: str | None = None):
    db.orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {"status": status},
            "$push": {"status_logs": status_log_entry(status, actor, message)},
        },
    )


def admin_update_status(order_id: str, data: OrderStatusUpdate, actor: str):
    if data.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 주문 상태입니다.")
    order = get_order_or_404(order_id)
    append_order_status(order, data.status, actor, "관리자 상태 변경")
    create_activity_log(actor, "admin", "update_order_status", f"{order.get('order_id')} 상태 변경")
    return {"ok": True}


def admin_delete_order(order_id: str, actor: str):
    order = get_order_or_404(order_id)
    db.orders.delete_one({"_id": order["_id"]})
    create_activity_log(actor, "admin", "delete_order", f"{order.get('order_id')} 주문 삭제")
    return {"ok": True}


def _validate_store_order(order: dict, actor: dict):
    store = get_store_by_owner(actor["username"])
    if not store or order.get("store_id") != store["_id"]:
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")


def store_accept(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    _validate_store_order(order, actor)
    append_order_status(order, "accepted", actor["username"], "가게가 주문을 수락했습니다.")
    create_activity_log(actor["username"], "store", "store_accept", f"{order.get('order_id')} 주문 수락")
    return {"message": "store accepted"}


def store_reject(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    _validate_store_order(order, actor)
    append_order_status(order, "cancelled", actor["username"], "가게가 주문을 거절했습니다.")
    create_activity_log(actor["username"], "store", "store_reject", f"{order.get('order_id')} 주문 거절")
    return {"message": "rejected"}


def store_dispatch(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    _validate_store_order(order, actor)
    db.orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {"status": "dispatch_ready", "rejected_drivers": []},
            "$push": {"status_logs": status_log_entry("dispatch_ready", actor["username"], "배차 요청")},
        },
    )
    create_activity_log(actor["username"], "store", "dispatch_request", f"{order.get('order_id')} 배차 요청")
    return {"message": "dispatch requested"}


def get_driver_current_status(username: str) -> str:
    active_order = db.orders.find_one(
        {"driver_id": username, "status": {"$in": ["assigned", "delivering"]}}
    )
    return "배달중" if active_order else "대기"


def driver_accept(order_id: str, actor: dict):
    driver_user = get_user_by_username(actor["username"])
    if driver_user and driver_user.get("onlineStatus") != "online":
        raise HTTPException(status_code=400, detail="온라인 상태에서만 배차를 수락할 수 있습니다.")

    order = get_order_or_404(order_id)
    if order.get("status") != "dispatch_ready":
        raise HTTPException(status_code=400, detail="배차 요청 상태가 아닙니다.")

    db.orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {"driver_id": actor["username"], "status": "assigned"},
            "$push": {"status_logs": status_log_entry("assigned", actor["username"], "기사가 배차를 수락했습니다.")},
        },
    )
    create_activity_log(actor["username"], "driver", "driver_accept", f"{order.get('order_id')} 배차 수락")
    return {"message": "assigned"}


def driver_reject(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("status") != "dispatch_ready":
        raise HTTPException(status_code=400, detail="배차 요청 상태가 아닙니다.")

    db.orders.update_one(
        {"_id": order["_id"]},
        {"$addToSet": {"rejected_drivers": actor["username"]}},
    )
    create_activity_log(actor["username"], "driver", "driver_reject", f"{order.get('order_id')} 배차 거절")
    return {"message": "rejected"}


def driver_start(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("driver_id") != actor["username"]:
        raise HTTPException(status_code=403, detail="본인 배달만 시작할 수 있습니다.")
    append_order_status(order, "delivering", actor["username"], "배달 시작")
    create_activity_log(actor["username"], "driver", "start_delivery", f"{order.get('order_id')} 배달 시작")
    return {"message": "started"}


def driver_complete(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("driver_id") != actor["username"]:
        raise HTTPException(status_code=403, detail="본인 배달만 완료할 수 있습니다.")
    append_order_status(order, "completed", actor["username"], "배달 완료")
    create_activity_log(actor["username"], "driver", "complete_delivery", f"{order.get('order_id')} 배달 완료")
    return {"message": "completed"}


def get_admin_order_query(filter_value: str):
    if filter_value not in ADMIN_ORDER_FILTERS:
        raise HTTPException(status_code=400, detail="유효하지 않은 필터입니다.")
    if filter_value == "all":
        return {}
    if filter_value == "in_progress":
        return {"status": {"$in": ["pending", "accepted", "dispatch_ready", "assigned", "delivering"]}}
    return {"status": filter_value}


def get_admin_orders(filter_value: str):
    return [serialize_order(order) for order in db.orders.find(get_admin_order_query(filter_value)).sort("created_at", -1)]


def get_store_order_query(store_id: ObjectId, filter_value: str):
    if filter_value not in STORE_ORDER_FILTERS:
        raise HTTPException(status_code=400, detail="유효하지 않은 필터입니다.")
    query = {"store_id": store_id}
    if filter_value == "all":
        return query
    if filter_value == "in_progress":
        query["status"] = {"$in": ["pending", "accepted", "dispatch_ready", "assigned", "delivering"]}
        return query
    query["status"] = filter_value
    return query


def get_drivers():
    drivers = []
    for driver in db.users.find({"role": "driver"}).sort("created_at", -1):
        data = serialize_user(driver)
        orders = list(db.orders.find({"driver_id": driver.get("username")}).sort("created_at", -1))
        completed_orders = [order for order in orders if order.get("status") == "completed"]
        data["currentDeliveryStatus"] = get_driver_current_status(driver.get("username"))
        data["earnings"] = sum(order.get("driver_fee", 0) for order in completed_orders)
        data["deliveries"] = len(completed_orders)
        data["orders"] = [serialize_order(order) for order in orders]
        drivers.append(data)
    return drivers


def create_driver(data: UserCreate):
    return serialize_user(
        create_user(data.username, data.password, data.phone, "driver", approved=True, onlineStatus="offline")
    )


def update_driver(driver_id: str, data: DriverUpdate):
    driver = get_user_or_404(driver_id)
    if driver.get("role") != "driver":
        raise HTTPException(status_code=400, detail="기사 계정이 아닙니다.")

    update_data = {}
    if data.phone is not None:
        update_data["phone"] = data.phone.strip()
    if data.onlineStatus is not None:
        if data.onlineStatus not in DRIVER_ONLINE_STATUSES:
            raise HTTPException(status_code=400, detail="유효하지 않은 온라인 상태입니다.")
        update_data["onlineStatus"] = data.onlineStatus

    if update_data:
        db.users.update_one({"_id": driver["_id"]}, {"$set": update_data})

    return serialize_user(db.users.find_one({"_id": driver["_id"]}))


def delete_driver(driver_id: str, actor: str):
    driver = get_user_or_404(driver_id)
    if driver.get("role") != "driver":
        raise HTTPException(status_code=400, detail="기사 계정이 아닙니다.")

    db.users.delete_one({"_id": driver["_id"]})
    db.orders.update_many(
        {
            "driver_id": driver.get("username"),
            "status": {"$in": ["assigned", "delivering"]},
        },
        {
            "$set": {"driver_id": None, "status": "dispatch_ready"},
            "$push": {"status_logs": status_log_entry("dispatch_ready", "admin", "기사 삭제로 인해 재배차")},
        },
    )
    create_activity_log(actor, "admin", "delete_driver", f"{driver.get('username')} 기사 삭제")
    return {"ok": True}


def get_customers():
    customers = []
    for customer in db.users.find({"role": "customer"}).sort("created_at", -1):
        data = serialize_user(customer)
        orders = list(db.orders.find({"user": customer.get("username")}).sort("created_at", -1))
        data["orders"] = [serialize_order(order) for order in orders]
        data["orderCount"] = len(orders)
        data["totalSpent"] = sum(order.get("total_price", 0) for order in orders if order.get("status") == "completed")
        if not data["address"] and orders:
            data["address"] = orders[0].get("address")
        customers.append(data)
    return customers


def update_customer(customer_id: str, data: CustomerUpdate):
    customer = get_user_or_404(customer_id)
    if customer.get("role") != "customer":
        raise HTTPException(status_code=400, detail="고객 계정이 아닙니다.")

    update_data = {}
    if data.phone is not None:
        update_data["phone"] = data.phone.strip()
        db.orders.update_many({"user": customer.get("username")}, {"$set": {"phone": data.phone.strip()}})
    if data.address is not None:
        update_data["address"] = data.address.strip()

    db.users.update_one({"_id": customer["_id"]}, {"$set": update_data})
    return serialize_user(db.users.find_one({"_id": customer["_id"]}))


def get_stats():
    orders = list(db.orders.find())
    total_orders = len(orders)
    total_sales = sum(order.get("total_price", 0) for order in orders if order.get("status") == "completed")
    today_orders = sum(1 for order in orders if is_today(order.get("created_at")))
    store_sales = {}
    status_count = {}

    for order in orders:
        store_name = order.get("store_name")
        status = order.get("status")
        if store_name not in store_sales:
            store_sales[store_name] = 0
        if status == "completed":
            store_sales[store_name] += order.get("total_price", 0)
        status_count[status] = status_count.get(status, 0) + 1

    return {
        "total_orders": total_orders,
        "total_sales": total_sales,
        "today_orders": today_orders,
        "store_sales": store_sales,
        "status_count": status_count,
    }


def update_driver_online_status(actor: dict, data: DriverOnlineUpdate):
    if data.onlineStatus not in DRIVER_ONLINE_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 온라인 상태입니다.")
    db.users.update_one({"username": actor["username"]}, {"$set": {"onlineStatus": data.onlineStatus}})
    create_activity_log(actor["username"], "driver", "toggle_online_status", f"기사 상태를 {data.onlineStatus} 로 변경")
    return {"ok": True}


def get_driver_dashboard(actor: dict):
    driver_user = get_user_by_username(actor["username"])
    completed_today = [
        order
        for order in db.orders.find({"driver_id": actor["username"], "status": "completed"})
        if is_today(order.get("created_at"))
    ]
    current_order = db.orders.find_one(
        {"driver_id": actor["username"], "status": {"$in": ["assigned", "delivering"]}}
    )

    return {
        "onlineStatus": driver_user.get("onlineStatus", "offline") if driver_user else "offline",
        "todayDeliveries": len(completed_today),
        "todayEarnings": sum(order.get("driver_fee", 0) for order in completed_today),
        "currentStatus": get_driver_current_status(actor["username"]),
        "currentOrder": serialize_order(current_order) if current_order else None,
    }


def get_driver_available_orders(actor: dict):
    return [
        serialize_order(order)
        for order in db.orders.find(
            {
                "status": "dispatch_ready",
                "rejected_drivers": {"$ne": actor["username"]},
            }
        ).sort("created_at", -1)
    ]


def get_driver_orders_for_period(username: str, period: str):
    start_date = get_start_date(period)
    return list(
        db.orders.find(
            {
                "driver_id": username,
                "status": "completed",
                "created_at": {"$gte": start_date},
            }
        ).sort("created_at", -1)
    )


def get_driver_history(actor: dict, period: str):
    return [serialize_order(order) for order in get_driver_orders_for_period(actor["username"], period)]


def get_driver_earnings(actor: dict, period: str):
    orders = get_driver_orders_for_period(actor["username"], period)
    return {
        "period": period,
        "totalEarnings": sum(order.get("driver_fee", 0) for order in orders),
        "totalDeliveries": len(orders),
        "orders": [serialize_order(order) for order in orders],
    }


def get_store_orders(actor: dict, filter_value: str):
    store = get_store_by_owner(actor["username"])
    if not store:
        return []
    query = get_store_order_query(store["_id"], filter_value)
    return [serialize_order(order) for order in db.orders.find(query).sort("created_at", -1)]


def get_store_stats(actor: dict):
    store = get_store_by_owner(actor["username"])
    if not store:
        return {
            "todaySales": 0,
            "totalSales": 0,
            "totalOrders": 0,
            "completedOrders": 0,
            "cancelledOrders": 0,
            "orders": [],
        }

    orders = list(db.orders.find({"store_id": store["_id"]}).sort("created_at", -1))
    completed_orders = [order for order in orders if order.get("status") == "completed"]

    return {
        "todaySales": sum(order.get("total_price", 0) for order in completed_orders if is_today(order.get("created_at"))),
        "totalSales": sum(order.get("total_price", 0) for order in completed_orders),
        "totalOrders": len(orders),
        "completedOrders": len(completed_orders),
        "cancelledOrders": len([order for order in orders if order.get("status") == "cancelled"]),
        "orders": [serialize_order(order) for order in orders[:20]],
    }


def get_store_my_info(actor: dict):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    menus = [serialize_menu(menu) for menu in db.menus.find({"store_id": store["_id"]}).sort("name", 1)]
    return {
        **serialize_store(store, include_internal=True),
        "menus": menus,
        "currentOrderCount": get_store_current_order_count(store["_id"]),
    }


def toggle_store_open(actor: dict, is_open: bool):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    db.stores.update_one({"_id": store["_id"]}, {"$set": {"isOpen": is_open}})
    create_activity_log(actor["username"], "store", "toggle_open", f"영업 상태 {is_open}")
    return get_store_my_info(actor)


def set_store_time(actor: dict, open_time: str, close_time: str):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    db.stores.update_one(
        {"_id": store["_id"]},
        {"$set": {"openTime": open_time, "closeTime": close_time}},
    )
    create_activity_log(actor["username"], "store", "set_time", "영업시간 변경")
    return get_store_my_info(actor)


def toggle_store_auto_accept(actor: dict, auto_accept: bool):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    db.stores.update_one(
        {"_id": store["_id"]},
        {"$set": {"autoAccept": auto_accept}},
    )
    create_activity_log(actor["username"], "store", "toggle_auto_accept", f"자동수락 {auto_accept}")
    return get_store_my_info(actor)
