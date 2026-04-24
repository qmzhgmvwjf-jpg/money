from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from bson import ObjectId
from fastapi import HTTPException
from jose import jwt
from pydantic import BaseModel

from backend.core.config import (
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
    STORE_STATUSES,
)
from backend.core.database import db


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
    storeName: str
    storeStatus: str = "open"


class StoreUpdate(BaseModel):
    storeName: str | None = None
    phone: str | None = None
    storeStatus: str | None = None


class DriverUpdate(BaseModel):
    phone: str | None = None
    onlineStatus: str | None = None


class CustomerUpdate(BaseModel):
    phone: str | None = None
    address: str | None = None


class Order(BaseModel):
    store: str
    address: str | None = None
    items: list[dict[str, Any]] | None = None


class Menu(BaseModel):
    store: str
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


def normalize_legacy_order(order: dict) -> dict:
    changed = False
    if not order.get("order_id"):
        order["order_id"] = build_order_id()
        changed = True
    if "customer_name" not in order:
        order["customer_name"] = order.get("user")
        changed = True
    if "phone" not in order:
        customer = get_user_by_username(order.get("user")) if order.get("user") else None
        order["phone"] = customer.get("phone") if customer else None
        changed = True
    if "total_price" not in order:
        order["total_price"] = calc_total_price(order.get("items"))
        changed = True
    if "driver_fee" not in order:
        order["driver_fee"] = calc_driver_fee(order.get("total_price", 0))
        changed = True
    if "status_logs" not in order:
        order["status_logs"] = [status_log_entry(order.get("status", "pending"), "system", "기존 주문 이력")]
        changed = True
    if "rejected_drivers" not in order:
        order["rejected_drivers"] = []
        changed = True

    if changed:
        db.orders.update_one(
            {"_id": order["_id"]},
            {
                "$set": {
                    "order_id": order["order_id"],
                    "customer_name": order["customer_name"],
                    "phone": order["phone"],
                    "total_price": order["total_price"],
                    "driver_fee": order["driver_fee"],
                    "status_logs": order["status_logs"],
                    "rejected_drivers": order["rejected_drivers"],
                }
            },
        )
    return order


def serialize_order(order: dict) -> dict:
    order = normalize_legacy_order(order)
    return {
        "_id": str(order["_id"]),
        "order_id": order.get("order_id"),
        "store": order.get("store"),
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
        "status_logs": [{**log, "created_at": to_iso(log.get("created_at"))} for log in order.get("status_logs", [])],
    }


def serialize_menu(menu: dict) -> dict:
    return {
        "_id": str(menu["_id"]),
        "store": menu.get("store"),
        "name": menu.get("name"),
        "price": menu.get("price"),
    }


def serialize_user(user: dict) -> dict:
    return {
        "_id": str(user["_id"]),
        "username": user.get("username"),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "approved": user.get("approved", False),
        "storeName": user.get("storeName"),
        "storeStatus": user.get("storeStatus", "open"),
        "address": user.get("address"),
        "onlineStatus": user.get("onlineStatus", "offline"),
        "created_at": to_iso(user.get("created_at")),
        "last_active_at": to_iso(user.get("last_active_at")),
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
            "storeName": None,
            "storeStatus": None,
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
        "storeName": extra.pop("storeName", None),
        "storeStatus": extra.pop("storeStatus", None),
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


def get_driver_current_status(username: str) -> str:
    return "배달중" if db.orders.find_one({"driver_id": username, "status": {"$in": ["assigned", "delivering"]}}) else "대기"


def get_admin_order_query(filter_value: str):
    if filter_value not in ADMIN_ORDER_FILTERS:
      raise HTTPException(status_code=400, detail="유효하지 않은 필터입니다.")
    if filter_value == "all":
        return {}
    if filter_value == "in_progress":
        return {"status": {"$in": ["pending", "accepted", "dispatch_ready", "assigned", "delivering"]}}
    return {"status": filter_value}


def get_store_order_query(store_name: str, filter_value: str):
    if filter_value not in STORE_ORDER_FILTERS:
        raise HTTPException(status_code=400, detail="유효하지 않은 필터입니다.")
    query = {"store": store_name}
    if filter_value == "all":
        return query
    if filter_value == "in_progress":
        query["status"] = {"$in": ["pending", "accepted", "dispatch_ready", "assigned", "delivering"]}
    else:
        query["status"] = filter_value
    return query


def append_order_status(order: dict, status: str, actor: str, message: str | None = None):
    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": status}, "$push": {"status_logs": status_log_entry(status, actor, message)}},
    )


def get_driver_orders_for_period(username: str, period: str):
    return list(
        db.orders.find(
            {
                "driver_id": username,
                "status": "completed",
                "created_at": {"$gte": get_start_date(period)},
            }
        ).sort("created_at", -1)
    )


def register_user(data: RegisterData):
    role = data.role.strip()
    store_name = data.storeName.strip() if data.storeName else None
    if role not in REGISTER_ROLES:
        raise HTTPException(status_code=400, detail="유효하지 않은 역할입니다.")
    if role == "store" and not store_name:
        raise HTTPException(status_code=400, detail="가게명 입력이 필요합니다.")
    user = create_user(
        username=data.username,
        password=data.password,
        phone=data.phone,
        role=role,
        approved=role == "customer",
        storeName=store_name if role == "store" else None,
        storeStatus="open" if role == "store" else None,
    )
    return {"message": "회원가입 완료", "approved": user["approved"]}


def login_user(data: LoginData):
    user = get_user_by_username(data.username.strip())
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("approved", False):
        raise HTTPException(status_code=403, detail="승인 대기 중인 계정입니다.")
    token = jwt.encode({"username": user["username"], "role": user["role"]}, SECRET_KEY, algorithm=ALGORITHM)
    create_activity_log(user["username"], user["role"], "login", "로그인")
    return {
        "token": token,
        "role": user["role"],
        "username": user["username"],
        "phone": user.get("phone"),
        "storeName": user.get("storeName"),
        "address": user.get("address"),
        "onlineStatus": user.get("onlineStatus"),
    }


def get_pending_users():
    return [serialize_user(item) for item in db.users.find({"approved": False, "role": {"$in": ["store", "driver"]}}).sort("created_at", -1)]


def approve_user(user_id: str, actor: str):
    target_user = get_user_or_404(user_id)
    update_data = {"approved": True}
    if target_user.get("role") == "store" and not target_user.get("storeStatus"):
        update_data["storeStatus"] = "open"
    db.users.update_one({"_id": target_user["_id"]}, {"$set": update_data})
    create_activity_log(actor, "admin", "approve_user", f"{target_user['username']} 승인")
    return {"message": "approved"}


def get_activity_logs(limit: int):
    return [serialize_activity(log) for log in db.activity_logs.find().sort("created_at", -1).limit(limit)]


def get_notices_for_role(role: str):
    if role == "admin":
        query = {}
    elif role == "store":
        query = {"target": {"$in": ["all", "store"]}}
    elif role == "driver":
        query = {"target": {"$in": ["all", "driver"]}}
    else:
        query = {"target": "all"}
    return [serialize_notice(notice) for notice in db.notices.find(query).sort("created_at", -1)]


def create_notice(data: NoticeCreate, actor: str):
    title = data.title.strip()
    content = data.content.strip()
    target = data.target.strip()
    if not title or not content:
        raise HTTPException(status_code=400, detail="제목과 내용을 입력하세요.")
    if target not in NOTICE_TARGETS:
        raise HTTPException(status_code=400, detail="유효하지 않은 공지 대상입니다.")
    notice = {
        "title": title,
        "content": content,
        "target": target,
        "created_at": now_utc(),
        "created_by": actor,
        "read_by": [],
    }
    result = db.notices.insert_one(notice)
    notice["_id"] = result.inserted_id
    create_activity_log(actor, "admin", "create_notice", f"공지 작성: {title}")
    return serialize_notice(notice)


def update_notice(notice_id: str, data: NoticeUpdate, actor: str):
    notice = get_notice_or_404(notice_id)
    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title.strip()
    if data.content is not None:
        update_data["content"] = data.content.strip()
    if data.target is not None:
        if data.target not in NOTICE_TARGETS:
            raise HTTPException(status_code=400, detail="유효하지 않은 공지 대상입니다.")
        update_data["target"] = data.target
    db.notices.update_one({"_id": notice["_id"]}, {"$set": update_data})
    create_activity_log(actor, "admin", "update_notice", f"공지 수정: {notice.get('title')}")
    return serialize_notice(db.notices.find_one({"_id": notice["_id"]}))


def delete_notice(notice_id: str, actor: str):
    notice = get_notice_or_404(notice_id)
    db.notices.delete_one({"_id": notice["_id"]})
    create_activity_log(actor, "admin", "delete_notice", f"공지 삭제: {notice.get('title')}")
    return {"ok": True}


def read_notice(notice_id: str, username: str):
    notice = get_notice_or_404(notice_id)
    if username not in notice.get("read_by", []):
        db.notices.update_one({"_id": notice["_id"]}, {"$push": {"read_by": username}})
    return {"ok": True}


def create_menu(menu: Menu, actor: dict):
    if actor["role"] == "store" and actor.get("storeName") != menu.store:
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 등록할 수 있습니다.")
    db.menus.insert_one({"store": menu.store, "name": menu.name, "price": menu.price})
    create_activity_log(actor["username"], actor["role"], "create_menu", f"{menu.store} 메뉴 등록: {menu.name}")
    return {"message": "ok"}


def get_menus():
    closed_stores = [store.get("storeName") for store in db.users.find({"role": "store", "storeStatus": "closed"})]
    query = {"store": {"$nin": closed_stores}} if closed_stores else {}
    return [serialize_menu(menu) for menu in db.menus.find(query)]


def delete_menu(menu_id: str, actor: dict):
    menu = db.menus.find_one({"_id": object_id_or_400(menu_id, "menu id")})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if actor["role"] == "store" and actor.get("storeName") != menu.get("store"):
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 삭제할 수 있습니다.")
    db.menus.delete_one({"_id": menu["_id"]})
    create_activity_log(actor["username"], actor["role"], "delete_menu", f"메뉴 삭제: {menu.get('name')}")
    return {"ok": True}


def update_menu(menu_id: str, data: dict, actor: dict):
    menu = db.menus.find_one({"_id": object_id_or_400(menu_id, "menu id")})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if actor["role"] == "store" and actor.get("storeName") != menu.get("store"):
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 수정할 수 있습니다.")
    db.menus.update_one({"_id": menu["_id"]}, {"$set": data})
    create_activity_log(actor["username"], actor["role"], "update_menu", f"메뉴 수정: {menu.get('name')}")
    return {"ok": True}


def create_order(order: Order, actor: dict):
    store_user = db.users.find_one({"role": "store", "storeName": order.store})
    if store_user and store_user.get("storeStatus") == "closed":
        raise HTTPException(status_code=400, detail="현재 영업 중지된 가게입니다.")
    items = order.items or []
    address = order.address or actor.get("address")
    total_price = calc_total_price(items)
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
        "status": "pending",
        "store": order.store,
        "driver_id": None,
        "driver_fee": calc_driver_fee(total_price),
        "status_logs": [status_log_entry("pending", actor["username"], "주문 생성")],
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
        query = {"store": actor.get("storeName")}
    elif actor["role"] == "driver":
        query = {"$or": [{"status": "dispatch_ready", "rejected_drivers": {"$ne": actor["username"]}}, {"driver_id": actor["username"]}]}
    else:
        query = {"user": actor["username"]}
    return [serialize_order(order) for order in db.orders.find(query).sort("created_at", -1)]


def get_my_orders(username: str):
    return [serialize_order(order) for order in db.orders.find({"user": username}).sort("created_at", -1)]


def admin_update_status(order_id: str, data: OrderStatusUpdate, actor: str):
    if data.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 주문 상태입니다.")
    order = get_order_or_404(order_id)
    append_order_status(order, data.status, actor, "관리자 상태 변경")
    create_activity_log(actor, "admin", "update_order_status", f"{order.get('order_id')} 상태를 {data.status} 로 변경")
    return {"ok": True}


def admin_delete_order(order_id: str, actor: str):
    order = get_order_or_404(order_id)
    db.orders.delete_one({"_id": order["_id"]})
    create_activity_log(actor, "admin", "delete_order", f"{order.get('order_id')} 주문 삭제")
    return {"ok": True}


def store_accept(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("store") != actor.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")
    append_order_status(order, "accepted", actor["username"], "가게가 주문을 수락했습니다.")
    create_activity_log(actor["username"], "store", "store_accept", f"{order.get('order_id')} 주문 수락")
    return {"message": "store accepted"}


def store_reject(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("store") != actor.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")
    append_order_status(order, "cancelled", actor["username"], "가게가 주문을 거절했습니다.")
    create_activity_log(actor["username"], "store", "store_reject", f"{order.get('order_id')} 주문 거절")
    return {"message": "rejected"}


def store_dispatch(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("store") != actor.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")
    append_order_status(order, "dispatch_ready", actor["username"], "기사 배차 요청")
    db.orders.update_one({"_id": order["_id"]}, {"$set": {"rejected_drivers": []}})
    create_activity_log(actor["username"], "store", "dispatch_request", f"{order.get('order_id')} 배차 요청")
    return {"message": "dispatch requested"}


def driver_accept(order_id: str, actor: dict):
    driver_user = get_user_by_username(actor["username"])
    if driver_user and driver_user.get("onlineStatus") != "online":
        raise HTTPException(status_code=400, detail="온라인 상태에서만 배차를 수락할 수 있습니다.")
    order = get_order_or_404(order_id)
    if order.get("status") != "dispatch_ready":
        raise HTTPException(status_code=400, detail="배차 요청 상태가 아닙니다.")
    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"driver_id": actor["username"], "status": "assigned"}, "$push": {"status_logs": status_log_entry("assigned", actor["username"], "기사가 배차를 수락했습니다.")}},
    )
    create_activity_log(actor["username"], "driver", "driver_accept", f"{order.get('order_id')} 배차 수락")
    return {"message": "assigned"}


def driver_reject(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("status") != "dispatch_ready":
        raise HTTPException(status_code=400, detail="배차 요청 상태가 아닙니다.")
    db.orders.update_one({"_id": order["_id"]}, {"$addToSet": {"rejected_drivers": actor["username"]}})
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


def get_admin_orders(filter_value: str):
    return [serialize_order(order) for order in db.orders.find(get_admin_order_query(filter_value)).sort("created_at", -1)]


def get_stores():
    stores = []
    for store in db.users.find({"role": "store"}).sort("created_at", -1):
        data = serialize_user(store)
        store_name = store.get("storeName")
        orders = list(db.orders.find({"store": store_name}).sort("created_at", -1))
        completed_orders = [order for order in orders if order.get("status") == "completed"]
        data["menus"] = [serialize_menu(menu) for menu in db.menus.find({"store": store_name})]
        data["sales"] = sum(normalize_legacy_order(order).get("total_price", 0) for order in completed_orders)
        data["orderCount"] = len(orders)
        data["orders"] = [serialize_order(order) for order in orders]
        stores.append(data)
    return stores


def create_store(data: StoreCreate):
    status = data.storeStatus if data.storeStatus in STORE_STATUSES else "open"
    return serialize_user(
        create_user(data.username, data.password, data.phone, "store", approved=True, storeName=data.storeName.strip(), storeStatus=status)
    )


def update_store(store_id: str, data: StoreUpdate, actor: str):
    store = get_user_or_404(store_id)
    if store.get("role") != "store":
        raise HTTPException(status_code=400, detail="가게 계정이 아닙니다.")
    update_data = {}
    old_store_name = store.get("storeName")
    if data.storeName is not None:
        if not data.storeName.strip():
            raise HTTPException(status_code=400, detail="가게명을 입력하세요.")
        update_data["storeName"] = data.storeName.strip()
    if data.phone is not None:
        update_data["phone"] = data.phone.strip()
    if data.storeStatus is not None:
        if data.storeStatus not in STORE_STATUSES:
            raise HTTPException(status_code=400, detail="유효하지 않은 가게 상태입니다.")
        update_data["storeStatus"] = data.storeStatus
    if update_data:
        db.users.update_one({"_id": store["_id"]}, {"$set": update_data})
        if "storeName" in update_data and old_store_name != update_data["storeName"]:
            db.menus.update_many({"store": old_store_name}, {"$set": {"store": update_data["storeName"]}})
            db.orders.update_many({"store": old_store_name}, {"$set": {"store": update_data["storeName"]}})
    create_activity_log(actor, "admin", "update_store", f"{store.get('username')} 가게 정보 수정")
    return serialize_user(db.users.find_one({"_id": store["_id"]}))


def delete_store(store_id: str, actor: str):
    store = get_user_or_404(store_id)
    if store.get("role") != "store":
        raise HTTPException(status_code=400, detail="가게 계정이 아닙니다.")
    db.users.delete_one({"_id": store["_id"]})
    db.menus.delete_many({"store": store.get("storeName")})
    create_activity_log(actor, "admin", "delete_store", f"{store.get('storeName')} 삭제")
    return {"ok": True}


def get_drivers():
    drivers = []
    for driver in db.users.find({"role": "driver"}).sort("created_at", -1):
        data = serialize_user(driver)
        orders = list(db.orders.find({"driver_id": driver.get("username")}).sort("created_at", -1))
        completed_orders = [order for order in orders if order.get("status") == "completed"]
        data["currentDeliveryStatus"] = get_driver_current_status(driver.get("username"))
        data["earnings"] = sum(normalize_legacy_order(order).get("driver_fee", 0) for order in completed_orders)
        data["deliveries"] = len(completed_orders)
        data["orders"] = [serialize_order(order) for order in orders]
        drivers.append(data)
    return drivers


def create_driver(data: UserCreate):
    return serialize_user(create_user(data.username, data.password, data.phone, "driver", approved=True, onlineStatus="offline"))


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
        {"driver_id": driver.get("username"), "status": {"$in": ["assigned", "delivering"]}},
        {"$set": {"driver_id": None, "status": "dispatch_ready"}, "$push": {"status_logs": status_log_entry("dispatch_ready", "admin", "기사 삭제로 인해 재배차")}},
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
        data["totalSpent"] = sum(normalize_legacy_order(order).get("total_price", 0) for order in orders if order.get("status") == "completed")
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
    orders = [normalize_legacy_order(order) for order in db.orders.find()]
    total_orders = len(orders)
    total_sales = sum(order.get("total_price", 0) for order in orders if order.get("status") == "completed")
    today_orders = sum(1 for order in orders if is_today(order.get("created_at")))
    store_sales = {}
    status_count = {}
    for order in orders:
        store_sales.setdefault(order.get("store"), 0)
        if order.get("status") == "completed":
            store_sales[order.get("store")] += order.get("total_price", 0)
        status_count[order.get("status")] = status_count.get(order.get("status"), 0) + 1
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
    completed_today = [normalize_legacy_order(order) for order in db.orders.find({"driver_id": actor["username"], "status": "completed"}) if is_today(order.get("created_at"))]
    current_order = db.orders.find_one({"driver_id": actor["username"], "status": {"$in": ["assigned", "delivering"]}})
    return {
        "onlineStatus": driver_user.get("onlineStatus", "offline") if driver_user else "offline",
        "todayDeliveries": len(completed_today),
        "todayEarnings": sum(order.get("driver_fee", 0) for order in completed_today),
        "currentStatus": get_driver_current_status(actor["username"]),
        "currentOrder": serialize_order(current_order) if current_order else None,
    }


def get_driver_available_orders(actor: dict):
    return [serialize_order(order) for order in db.orders.find({"status": "dispatch_ready", "rejected_drivers": {"$ne": actor["username"]}}).sort("created_at", -1)]


def get_driver_history(actor: dict, period: str):
    return [serialize_order(order) for order in get_driver_orders_for_period(actor["username"], period)]


def get_driver_earnings(actor: dict, period: str):
    orders = get_driver_orders_for_period(actor["username"], period)
    return {
        "period": period,
        "totalEarnings": sum(normalize_legacy_order(order).get("driver_fee", 0) for order in orders),
        "totalDeliveries": len(orders),
        "orders": [serialize_order(order) for order in orders],
    }


def get_store_orders(actor: dict, filter_value: str):
    return [serialize_order(order) for order in db.orders.find(get_store_order_query(actor.get("storeName"), filter_value)).sort("created_at", -1)]


def get_store_stats(actor: dict):
    orders = [normalize_legacy_order(order) for order in db.orders.find({"store": actor.get("storeName")}).sort("created_at", -1)]
    completed_orders = [order for order in orders if order.get("status") == "completed"]
    return {
        "todaySales": sum(order.get("total_price", 0) for order in completed_orders if is_today(order.get("created_at"))),
        "totalSales": sum(order.get("total_price", 0) for order in completed_orders),
        "totalOrders": len(orders),
        "completedOrders": len(completed_orders),
        "cancelledOrders": len([order for order in orders if order.get("status") == "cancelled"]),
        "orders": [serialize_order(order) for order in orders[:20]],
    }
