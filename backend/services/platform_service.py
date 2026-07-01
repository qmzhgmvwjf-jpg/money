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
    DRIVER_OPERATION_STATUSES,
    DRIVER_FEE_RATE,
    DRIVER_ONLINE_STATUSES,
    NOTICE_TARGETS,
    ORDER_STATUSES,
    REGISTER_ROLES,
    SECRET_KEY,
    STATUS_TO_KOREAN,
    STORE_ORDER_FILTERS,
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
    driverStatus: str | None = None
    dispatchEnabled: bool | None = None
    approved: bool | None = None


class CustomerUpdate(BaseModel):
    phone: str | None = None
    address: str | None = None
    nickname: str | None = None


class Order(BaseModel):
    store_id: str
    address: str | None = None
    phone: str | None = None
    items: list[dict[str, Any]] | None = None
    paymentMethod: str = "card"
    rewardId: str | None = None


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
    onlineStatus: str | None = None
    driverStatus: str | None = None


class StoreSettingsUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    phone: str | None = None
    minOrderAmount: int | None = None
    deliveryFee: int | None = None
    bankName: str | None = None
    accountNumber: str | None = None
    accountHolder: str | None = None
    openTime: str | None = None
    closeTime: str | None = None
    isOpen: bool | None = None
    autoAccept: bool | None = None


class StoreTopupRequestCreate(BaseModel):
    amount: int
    depositorName: str
    note: str | None = None


class StoreWithdrawalRequestCreate(BaseModel):
    amount: int
    note: str | None = None


class DriverSettingsUpdate(BaseModel):
    phone: str | None = None
    onlineStatus: str | None = None
    driverStatus: str | None = None
    dispatchEnabled: bool | None = None
    bankName: str | None = None
    accountNumber: str | None = None
    accountHolder: str | None = None


class ManualDispatchPayload(BaseModel):
    driverUsername: str


class DriverWithdrawalRequestCreate(BaseModel):
    amount: int
    note: str | None = None


class AdminDecisionPayload(BaseModel):
    note: str | None = None


class BalanceAdjustPayload(BaseModel):
    amount: int
    note: str | None = None


class ContentPostCreate(BaseModel):
    title: str
    caption: str
    videoUrl: str
    thumbnailUrl: str | None = None
    contentType: str = "food"
    menuName: str | None = None
    price: int | None = None
    eventLabel: str | None = None


class ContentPostUpdate(BaseModel):
    title: str | None = None
    caption: str | None = None
    videoUrl: str | None = None
    thumbnailUrl: str | None = None
    contentType: str | None = None
    menuName: str | None = None
    price: int | None = None
    eventLabel: str | None = None


class StoreStoryCreate(BaseModel):
    title: str
    content: str
    imageUrl: str | None = None
    storyType: str = "today"


class StoreStoryUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    imageUrl: str | None = None
    storyType: str | None = None


class RegularNoteCreate(BaseModel):
    message: str


class AlbumEntryCreate(BaseModel):
    title: str
    caption: str
    imageUrl: str | None = None


class GuestbookEntryCreate(BaseModel):
    message: str


class AppEventCreate(BaseModel):
    title: str
    description: str
    emoji: str
    rewardType: str
    rewardValue: int = 0
    kind: str = "daily"
    isActive: bool = True
    isHidden: bool = False


class AppEventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    emoji: str | None = None
    rewardType: str | None = None
    rewardValue: int | None = None
    kind: str | None = None
    isActive: bool | None = None
    isHidden: bool | None = None


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(value: datetime | None) -> str | None:
    if not value:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def date_key(value: datetime | None = None) -> str:
    base = value or now_utc()
    return base.astimezone(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")


def safe_nickname(value: str | None) -> str:
    raw = (value or "손님").strip()
    if len(raw) <= 2:
        return raw[0] + "*" if len(raw) == 2 else raw
    return f"{raw[0]}{'*' * min(2, len(raw) - 2)}{raw[-1]}"


def category_from_text(value: str) -> str:
    lower = (value or "").lower()
    if "치킨" in lower:
        return "치킨"
    if "피자" in lower:
        return "피자"
    if "카페" in lower or "커피" in lower or "디저트" in lower:
        return "카페"
    if "마라" in lower or "떡볶이" in lower or "매운" in lower:
        return "매운맛"
    if "분식" in lower or "김밥" in lower or "라면" in lower:
        return "분식"
    return "추천"


def get_driver_active_order(username: str):
    return db.orders.find_one(
        {"driver_id": username, "status": {"$in": ["assigned", "delivering"]}},
        sort=[("created_at", -1)],
    )


def normalize_driver_status(user: dict | None) -> str:
    if not user:
        return "offline"
    explicit = user.get("driverStatus")
    if explicit == "suspended":
        return "suspended"
    if explicit == "resting":
        return "resting"
    if explicit == "offline":
        return "offline"
    if get_driver_active_order(user.get("username")):
        return "delivering"
    if explicit in {"idle", "delivering"}:
        return "idle" if explicit == "idle" else "delivering"
    if user.get("onlineStatus") == "online":
        return "idle"
    return "offline"


def driver_online_label(driver_status: str) -> str:
    return "online" if driver_status in {"idle", "delivering", "resting"} else "offline"


def get_driver_active_order_count(username: str) -> int:
    return db.orders.count_documents(
        {"driver_id": username, "status": {"$in": ["assigned", "delivering"]}}
    )


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


def build_payment_id() -> str:
    return f"PAY-{now_utc().strftime('%Y%m%d%H%M%S%f')}"


def build_transaction_id() -> str:
    return f"TRX-{now_utc().strftime('%Y%m%d%H%M%S%f')}"


SAMPLE_VIDEO_URLS = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
]

STICKER_CATALOG = [
    {
        "code": "chicken_lover",
        "emoji": "🍗",
        "title": "치킨 러버",
        "description": "치킨 카테고리 가게를 3번 이상 주문했어요.",
        "collection": "치킨 컬렉션",
    },
    {
        "code": "pizza_master",
        "emoji": "🍕",
        "title": "피자 마스터",
        "description": "피자 가게를 3번 이상 주문했어요.",
        "collection": "피자 컬렉션",
    },
    {
        "code": "cafe_addict",
        "emoji": "☕",
        "title": "카페 중독자",
        "description": "카페/디저트 가게를 3번 이상 주문했어요.",
        "collection": "카페 컬렉션",
    },
    {
        "code": "night_king",
        "emoji": "🌙",
        "title": "야식왕",
        "description": "밤 10시 이후 주문을 달성했어요.",
        "collection": "야식 컬렉션",
    },
    {
        "code": "spicy_challenger",
        "emoji": "🔥",
        "title": "매운맛 챌린저",
        "description": "매운 메뉴를 세 번 주문했어요.",
        "collection": "챌린지 컬렉션",
    },
    {
        "code": "regular_king",
        "emoji": "🥇",
        "title": "단골왕",
        "description": "같은 가게를 다섯 번 이상 주문했어요.",
        "collection": "단골 컬렉션",
    },
    {
        "code": "attendance_fairy",
        "emoji": "🎟️",
        "title": "출석 요정",
        "description": "서로 다른 날짜에 세 번 방문했어요.",
        "collection": "출석 컬렉션",
    },
]

REWARD_TYPE_LABELS = {
    "free_delivery": "무료 배달",
    "discount": "할인 쿠폰",
    "store_fee_free": "가게 이용료 무료",
    "sticker": "스티커 보상",
}


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


def create_transaction_log(
    type: str,
    amount: int,
    actor: str,
    actor_role: str,
    target: str,
    target_role: str,
    description: str,
    related_id: str | None = None,
    status: str = "completed",
):
    db.transactions.insert_one(
        {
            "transaction_id": build_transaction_id(),
            "type": type,
            "amount": int(amount),
            "status": status,
            "actor": actor,
            "actorRole": actor_role,
            "target": target,
            "targetRole": target_role,
            "description": description,
            "related_id": related_id,
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
        "description": store.get("description", ""),
        "phone": store.get("phone"),
        "isOpen": store.get("isOpen", False),
        "openTime": store.get("openTime"),
        "closeTime": store.get("closeTime"),
        "approved": store.get("approved", False),
        "autoAccept": store.get("autoAccept", False),
        "minOrderAmount": store.get("minOrderAmount", 0),
        "deliveryFee": store.get("deliveryFee", 0),
        "balance": store.get("balance", 0),
        "pendingSettlement": store.get("pendingSettlement", 0),
        "bankName": store.get("bankName"),
        "accountNumber": store.get("accountNumber"),
        "accountHolder": store.get("accountHolder"),
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
        "menu_total": order.get("menu_total", 0),
        "delivery_fee": order.get("delivery_fee", 0),
        "discount_amount": order.get("discount_amount", 0),
        "total_price": order.get("total_price", 0),
        "status": order.get("status"),
        "driver_id": order.get("driver_id"),
        "driver_fee": order.get("driver_fee", 0),
        "payment_id": order.get("payment_id"),
        "payment_method": order.get("payment_method"),
        "payment_status": order.get("payment_status"),
        "reward_id": order.get("reward_id"),
        "reward_title": order.get("reward_title"),
        "settlement_amount": order.get("settlement_amount", 0),
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
        "nickname": user.get("nickname") or safe_nickname(user.get("username")),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "approved": user.get("approved", False),
        "address": user.get("address"),
        "onlineStatus": user.get("onlineStatus", "offline"),
        "driverStatus": normalize_driver_status(user) if user.get("role") == "driver" else None,
        "dispatchEnabled": user.get("dispatchEnabled", True),
        "balance": user.get("balance", 0),
        "bankName": user.get("bankName"),
        "accountNumber": user.get("accountNumber"),
        "accountHolder": user.get("accountHolder"),
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


def serialize_payment(payment: dict) -> dict:
    return {
        "_id": str(payment["_id"]),
        "payment_id": payment.get("payment_id"),
        "order_id": payment.get("order_id"),
        "customer_name": payment.get("customer_name"),
        "store_id": str(payment.get("store_id")) if payment.get("store_id") else None,
        "store_name": payment.get("store_name"),
        "amount": payment.get("amount", 0),
        "method": payment.get("method"),
        "status": payment.get("status"),
        "created_at": to_iso(payment.get("created_at")),
    }


def serialize_topup_request(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "store_name": item.get("store_name"),
        "owner": item.get("owner"),
        "amount": item.get("amount", 0),
        "depositorName": item.get("depositorName"),
        "status": item.get("status"),
        "note": item.get("note"),
        "adminNote": item.get("adminNote"),
        "created_at": to_iso(item.get("created_at")),
        "processed_at": to_iso(item.get("processed_at")),
    }


def serialize_withdrawal_request(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "driver_id": str(item.get("driver_id")) if item.get("driver_id") else None,
        "driver_username": item.get("driver_username"),
        "amount": item.get("amount", 0),
        "status": item.get("status"),
        "note": item.get("note"),
        "adminNote": item.get("adminNote"),
        "bankName": item.get("bankName"),
        "accountNumber": item.get("accountNumber"),
        "accountHolder": item.get("accountHolder"),
        "created_at": to_iso(item.get("created_at")),
        "processed_at": to_iso(item.get("processed_at")),
    }


def serialize_store_withdrawal_request(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "store_name": item.get("store_name"),
        "owner": item.get("owner"),
        "amount": item.get("amount", 0),
        "status": item.get("status"),
        "note": item.get("note"),
        "adminNote": item.get("adminNote"),
        "bankName": item.get("bankName"),
        "accountNumber": item.get("accountNumber"),
        "accountHolder": item.get("accountHolder"),
        "created_at": to_iso(item.get("created_at")),
        "processed_at": to_iso(item.get("processed_at")),
    }


def serialize_transaction(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "transaction_id": item.get("transaction_id"),
        "type": item.get("type"),
        "amount": item.get("amount", 0),
        "status": item.get("status"),
        "actor": item.get("actor"),
        "actorRole": item.get("actorRole"),
        "target": item.get("target"),
        "targetRole": item.get("targetRole"),
        "description": item.get("description"),
        "related_id": item.get("related_id"),
        "created_at": to_iso(item.get("created_at")),
    }


def serialize_content_post(item: dict) -> dict:
    store = db.stores.find_one({"_id": item.get("store_id")}) if item.get("store_id") else None
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "store_name": item.get("store_name") or (store.get("name") if store else None),
        "title": item.get("title"),
        "caption": item.get("caption"),
        "video_url": item.get("video_url"),
        "thumbnail_url": item.get("thumbnail_url"),
        "content_type": item.get("content_type", "food"),
        "menu_name": item.get("menu_name"),
        "price": item.get("price"),
        "event_label": item.get("event_label"),
        "feed_reason": item.get("feed_reason"),
        "likes": item.get("likes", 0),
        "saves": item.get("saves", 0),
        "views": item.get("views", 0),
        "comments": item.get("comments", 0),
        "shares": item.get("shares", 0),
        "created_at": to_iso(item.get("created_at")),
    }


def get_regular_level(order_count: int) -> str:
    if order_count >= 15:
        return "전설의 단골"
    if order_count >= 8:
        return "VIP 단골"
    if order_count >= 3:
        return "단골"
    return "일반 손님"


def serialize_store_story(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "title": item.get("title"),
        "content": item.get("content"),
        "image_url": item.get("image_url"),
        "story_type": item.get("story_type", "today"),
        "author_name": item.get("author_name"),
        "created_at": to_iso(item.get("created_at")),
        "updated_at": to_iso(item.get("updated_at")),
    }


def serialize_store_regular_note(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "username": item.get("username"),
        "author_name": item.get("author_name"),
        "message": item.get("message"),
        "regular_level": item.get("regular_level", "일반 손님"),
        "order_count": item.get("order_count", 0),
        "created_at": to_iso(item.get("created_at")),
    }


def serialize_store_album_entry(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "author_role": item.get("author_role"),
        "username": item.get("username"),
        "author_name": item.get("author_name"),
        "title": item.get("title"),
        "caption": item.get("caption"),
        "image_url": item.get("image_url"),
        "created_at": to_iso(item.get("created_at")),
    }


def serialize_store_guestbook_entry(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "username": item.get("username"),
        "author_name": item.get("author_name"),
        "message": item.get("message"),
        "created_at": to_iso(item.get("created_at")),
    }


def serialize_sticker(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "username": item.get("username"),
        "code": item.get("code"),
        "emoji": item.get("emoji"),
        "title": item.get("title"),
        "description": item.get("description"),
        "collection": item.get("collection"),
        "earned_at": to_iso(item.get("earned_at")),
        "reason": item.get("reason"),
    }


def serialize_reward(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "username": item.get("username"),
        "source": item.get("source"),
        "source_event_id": str(item.get("source_event_id")) if item.get("source_event_id") else None,
        "title": item.get("title"),
        "description": item.get("description"),
        "emoji": item.get("emoji"),
        "reward_type": item.get("reward_type"),
        "reward_label": REWARD_TYPE_LABELS.get(item.get("reward_type"), item.get("reward_type")),
        "reward_value": item.get("reward_value", 0),
        "status": item.get("status", "active"),
        "claim_date_key": item.get("claim_date_key"),
        "created_at": to_iso(item.get("created_at")),
        "used_at": to_iso(item.get("used_at")),
    }


def serialize_app_event(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "title": item.get("title"),
        "description": item.get("description"),
        "emoji": item.get("emoji"),
        "reward_type": item.get("reward_type"),
        "reward_label": REWARD_TYPE_LABELS.get(item.get("reward_type"), item.get("reward_type")),
        "reward_value": item.get("reward_value", 0),
        "kind": item.get("kind", "daily"),
        "is_active": item.get("is_active", True),
        "is_hidden": item.get("is_hidden", False),
        "created_at": to_iso(item.get("created_at")),
    }


def serialize_follow(item: dict) -> dict:
    return {
        "_id": str(item["_id"]),
        "store_id": str(item.get("store_id")) if item.get("store_id") else None,
        "store_name": item.get("store_name"),
        "username": item.get("username"),
        "nickname": item.get("nickname"),
        "created_at": to_iso(item.get("created_at")),
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
        "nickname": extra.pop("nickname", safe_nickname(username)),
        "password": hash_password(password),
        "phone": phone,
        "role": role,
        "approved": extra.pop("approved", True),
        "address": extra.pop("address", None),
        "onlineStatus": extra.pop("onlineStatus", "offline" if role == "driver" else None),
        "driverStatus": extra.pop("driverStatus", "offline" if role == "driver" else None),
        "dispatchEnabled": extra.pop("dispatchEnabled", True if role == "driver" else None),
        "balance": extra.pop("balance", 0 if role == "driver" else None),
        "bankName": extra.pop("bankName", None),
        "accountNumber": extra.pop("accountNumber", None),
        "accountHolder": extra.pop("accountHolder", None),
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
    phone: str | None = None,
    is_open: bool = True,
    open_time: str = "09:00",
    close_time: str = "21:00",
    auto_accept: bool = False,
):
    store_doc = {
        "name": name.strip(),
        "owner": owner,
        "ownerUserId": owner_user_id,
        "description": "",
        "phone": phone,
        "isOpen": is_open,
        "openTime": open_time,
        "closeTime": close_time,
        "approved": approved,
        "autoAccept": auto_accept,
        "minOrderAmount": 0,
        "deliveryFee": 3000,
        "balance": 0,
        "pendingSettlement": 0,
        "bankName": None,
        "accountNumber": None,
        "accountHolder": None,
        "created_at": now_utc(),
    }
    result = db.stores.insert_one(store_doc)
    store_doc["_id"] = result.inserted_id
    return store_doc


def get_time_based_reason() -> str:
    hour = now_utc().astimezone(timezone(timedelta(hours=9))).hour
    if 6 <= hour < 11:
        return "아침에 잘 나가는 메뉴"
    if 11 <= hour < 15:
        return "점심 시간대 인기 피드"
    if 15 <= hour < 18:
        return "간식 시간 추천"
    if 18 <= hour < 23:
        return "저녁 주문이 몰리는 가게"
    return "야식으로 많이 찾는 메뉴"


def build_default_content_post(store: dict, menu: dict | None, index: int, reason: str) -> dict:
    menu_name = menu.get("name") if menu else f"{store.get('name')} 추천 메뉴"
    price = menu.get("price") if menu else store.get("minOrderAmount", 0)
    title = f"{store.get('name')} · {menu_name}"
    caption = f"{menu_name}가 지금 가장 반응이 좋은 영상이에요. {reason}"
    return {
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "title": title,
        "caption": caption,
        "video_url": SAMPLE_VIDEO_URLS[index % len(SAMPLE_VIDEO_URLS)],
        "thumbnail_url": None,
        "content_type": "food",
        "menu_name": menu_name,
        "price": price,
        "event_label": "오늘 추천",
        "feed_reason": reason,
        "likes": 120 + (index * 13),
        "saves": 24 + (index * 3),
        "views": 2400 + (index * 180),
        "comments": 18 + (index * 2),
        "shares": 9 + index,
        "created_at": now_utc() - timedelta(minutes=index * 7),
    }


def get_store_completed_order_count_for_user(store_id: ObjectId, username: str) -> int:
    return db.orders.count_documents(
        {
            "store_id": store_id,
            "user": username,
            "status": "completed",
        }
    )


def get_store_regular_badge(store_id: ObjectId, username: str) -> dict:
    order_count = get_store_completed_order_count_for_user(store_id, username)
    return {
        "orderCount": order_count,
        "level": get_regular_level(order_count),
    }


def get_support_flags(store_id: ObjectId, username: str | None) -> dict:
    if not username:
        return {"liked": False, "cheered": False, "isRegular": False}

    supports = list(db.store_supports.find({"store_id": store_id, "username": username}))
    types = {item.get("support_type") for item in supports}
    return {
        "liked": "like" in types,
        "cheered": "cheer" in types,
        "isRegular": "regular" in types,
    }


def get_store_support_counts(store_id: ObjectId) -> dict:
    supports = list(db.store_supports.find({"store_id": store_id}))
    return {
        "likes": len([item for item in supports if item.get("support_type") == "like"]),
        "cheers": len([item for item in supports if item.get("support_type") == "cheer"]),
        "regulars": len([item for item in supports if item.get("support_type") == "regular"]),
    }


def build_top_regulars(store_id: ObjectId, limit: int = 5) -> list[dict]:
    ranking: dict[str, dict[str, Any]] = {}
    for order in db.orders.find({"store_id": store_id, "status": "completed"}):
        username = order.get("user")
        if not username:
            continue
        current = ranking.setdefault(
            username,
            {
                "username": username,
                "author_name": order.get("customer_name") or username,
                "order_count": 0,
            },
        )
        current["order_count"] += 1

    top_regulars = sorted(ranking.values(), key=lambda item: item["order_count"], reverse=True)[:limit]
    return [
        {
            **item,
            "regular_level": get_regular_level(item["order_count"]),
        }
        for item in top_regulars
    ]


def build_monthly_regulars(store_id: ObjectId, limit: int = 10) -> list[dict]:
    month_start = now_utc().astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ranking: dict[str, dict[str, Any]] = {}
    for order in db.orders.find({"store_id": store_id, "status": "completed", "created_at": {"$gte": month_start}}):
        username = order.get("user")
        if not username:
            continue
        user = get_user_by_username(username) or {}
        current = ranking.setdefault(
            username,
            {
                "username": username,
                "author_name": user.get("nickname") or safe_nickname(username),
                "order_count": 0,
            },
        )
        current["order_count"] += 1

    ordered = sorted(ranking.values(), key=lambda item: item["order_count"], reverse=True)[:limit]
    return [
        {
            **item,
            "regular_level": get_regular_level(item["order_count"]),
        }
        for item in ordered
    ]


def grant_sticker(username: str, code: str, reason: str) -> dict | None:
    sticker_meta = next((item for item in STICKER_CATALOG if item["code"] == code), None)
    if not sticker_meta:
        return None
    if db.user_stickers.find_one({"username": username, "code": code}):
        return None

    doc = {
        "username": username,
        "code": code,
        "emoji": sticker_meta["emoji"],
        "title": sticker_meta["title"],
        "description": sticker_meta["description"],
        "collection": sticker_meta["collection"],
        "reason": reason,
        "earned_at": now_utc(),
    }
    result = db.user_stickers.insert_one(doc)
    doc["_id"] = result.inserted_id
    create_activity_log(username, "customer", "earn_sticker", f"{sticker_meta['title']} 스티커 획득")
    return doc


def evaluate_customer_stickers(username: str, store: dict, items: list[dict[str, Any]], created_at: datetime):
    store_name = store.get("name", "")
    store_category = category_from_text(store_name)
    user_orders = list(db.orders.find({"user": username}))
    same_store_orders = len([order for order in user_orders if order.get("store_id") == store["_id"]]) + 1
    store_category_orders = 1 + len(
        [order for order in user_orders if category_from_text(order.get("store_name", "")) == store_category]
    )
    spicy_hits = sum(
        1 for order in user_orders for item in order.get("items", []) if "매운" in (item.get("name", "") or "") or "마라" in (item.get("name", "") or "")
    ) + sum(1 for item in items if "매운" in (item.get("name", "") or "") or "마라" in (item.get("name", "") or ""))
    local_hour = created_at.astimezone(timezone(timedelta(hours=9))).hour

    if store_category == "치킨" and store_category_orders >= 3:
        grant_sticker(username, "chicken_lover", "치킨 주문을 꾸준히 즐기고 있어요.")
    if store_category == "피자" and store_category_orders >= 3:
        grant_sticker(username, "pizza_master", "피자를 자주 주문했어요.")
    if store_category == "카페" and store_category_orders >= 3:
        grant_sticker(username, "cafe_addict", "카페 주문을 자주 했어요.")
    if same_store_orders >= 5:
        grant_sticker(username, "regular_king", f"{store_name}를 다섯 번 이상 주문했어요.")
    if local_hour >= 22 or local_hour < 5:
        grant_sticker(username, "night_king", "늦은 밤 FEEDY에 접속했어요.")
    if spicy_hits >= 3:
        grant_sticker(username, "spicy_challenger", "매운맛 메뉴를 세 번 이상 즐겼어요.")


def record_customer_visit(actor: dict):
    if actor.get("role") != "customer":
        return
    today = date_key()
    exists = db.daily_visits.find_one({"username": actor["username"], "date_key": today})
    if exists:
        return
    db.daily_visits.insert_one(
        {
            "username": actor["username"],
            "date_key": today,
            "created_at": now_utc(),
        }
    )
    visit_days = db.daily_visits.count_documents({"username": actor["username"]})
    if visit_days >= 3:
        grant_sticker(actor["username"], "attendance_fairy", "서로 다른 날짜에 세 번 FEEDY를 방문했어요.")


def get_active_customer_events() -> list[dict]:
    return [serialize_app_event(item) for item in db.app_events.find({"is_active": True, "is_hidden": False}).sort("created_at", -1)]


def grant_reward_to_user(username: str, reward_type: str, reward_value: int, title: str, description: str, emoji: str, source: str, source_event_id: ObjectId | None = None):
    reward = {
        "username": username,
        "source": source,
        "source_event_id": source_event_id,
        "title": title,
        "description": description,
        "emoji": emoji,
        "reward_type": reward_type,
        "reward_value": int(reward_value or 0),
        "status": "active",
        "claim_date_key": date_key(),
        "created_at": now_utc(),
        "used_at": None,
    }
    result = db.user_rewards.insert_one(reward)
    reward["_id"] = result.inserted_id
    create_activity_log(username, "customer", "grant_reward", f"{title} 보상 획득")
    return reward


def get_available_rewards(username: str):
    return [
        serialize_reward(item)
        for item in db.user_rewards.find({"username": username, "status": "active"}).sort("created_at", -1)
    ]


def get_followed_stores(username: str):
    follows = list(db.store_follows.find({"username": username}).sort("created_at", -1))
    results = []
    for follow in follows:
        store = db.stores.find_one({"_id": follow.get("store_id")})
        latest_story = db.store_stories.find_one({"store_id": follow.get("store_id")}, sort=[("created_at", -1)])
        results.append(
            {
                **serialize_follow(follow),
                "store": serialize_store(store) if store else None,
                "latest_story": serialize_store_story(latest_story) if latest_story else None,
            }
        )
    return results


def get_sticker_book(username: str):
    earned = [serialize_sticker(item) for item in db.user_stickers.find({"username": username}).sort("earned_at", -1)]
    earned_codes = {item["code"] for item in earned}
    collections: dict[str, dict[str, Any]] = {}
    for item in STICKER_CATALOG:
        bucket = collections.setdefault(item["collection"], {"name": item["collection"], "total": 0, "earned": 0})
        bucket["total"] += 1
        if item["code"] in earned_codes:
            bucket["earned"] += 1

    return {
        "catalog": STICKER_CATALOG,
        "earned": earned,
        "collections": list(collections.values()),
    }


def get_customer_retention_summary(actor: dict):
    record_customer_visit(actor)
    recent_sticker = db.user_stickers.find_one({"username": actor["username"]}, sort=[("earned_at", -1)])
    lucky_claim = db.user_rewards.find_one(
        {"username": actor["username"], "source": "lucky_box", "claim_date_key": date_key()},
        sort=[("created_at", -1)],
    )
    return {
        "events": get_active_customer_events(),
        "availableRewards": get_available_rewards(actor["username"]),
        "stickerBook": get_sticker_book(actor["username"]),
        "followedStores": get_followed_stores(actor["username"]),
        "todayLuckyBoxClaimed": bool(lucky_claim),
        "todayLuckyReward": serialize_reward(lucky_claim) if lucky_claim else None,
        "recentSticker": serialize_sticker(recent_sticker) if recent_sticker else None,
    }


def claim_daily_lucky_box(actor: dict):
    if actor.get("role") != "customer":
        raise HTTPException(status_code=403, detail="손님만 참여할 수 있습니다.")
    existing = db.user_rewards.find_one(
        {"username": actor["username"], "source": "lucky_box", "claim_date_key": date_key()},
        sort=[("created_at", -1)],
    )
    if existing:
        return {"alreadyClaimed": True, "reward": serialize_reward(existing)}

    active_events = list(db.app_events.find({"is_active": True, "is_hidden": False}).sort("created_at", -1))
    if not active_events:
        reward = grant_reward_to_user(
            actor["username"],
            "discount",
            2000,
            "오늘의 행운쿠폰",
            "오늘은 2,000원 할인 쿠폰을 받았어요.",
            "🍀",
            "lucky_box",
        )
        return {"alreadyClaimed": False, "reward": serialize_reward(reward)}

    event = active_events[now_utc().microsecond % len(active_events)]
    if event.get("reward_type") == "sticker":
        sticker = grant_sticker(actor["username"], "attendance_fairy", f"{event.get('title')} 이벤트 보상")
        reward = grant_reward_to_user(
            actor["username"],
            "discount",
            1000,
            event.get("title"),
            f"{event.get('description')} 보너스로 1,000원 할인도 함께 드려요.",
            event.get("emoji", "🎁"),
            "lucky_box",
            event["_id"],
        )
        return {"alreadyClaimed": False, "reward": serialize_reward(reward), "sticker": serialize_sticker(sticker) if sticker else None}

    reward = grant_reward_to_user(
        actor["username"],
        event.get("reward_type", "discount"),
        event.get("reward_value", 0),
        event.get("title"),
        event.get("description"),
        event.get("emoji", "🎁"),
        "lucky_box",
        event["_id"],
    )
    return {"alreadyClaimed": False, "reward": serialize_reward(reward)}


def toggle_store_follow(store_id: str, actor: dict):
    if actor.get("role") != "customer":
        raise HTTPException(status_code=403, detail="손님만 팔로우할 수 있습니다.")
    store = get_store_or_404(store_id)
    existing = db.store_follows.find_one({"store_id": store["_id"], "username": actor["username"]})
    if existing:
        db.store_follows.delete_one({"_id": existing["_id"]})
        create_activity_log(actor["username"], "customer", "unfollow_store", f"{store.get('name')} 팔로우 해제")
        return {"following": False}

    user = get_user_by_username(actor["username"]) or {}
    db.store_follows.insert_one(
        {
            "store_id": store["_id"],
            "store_name": store.get("name"),
            "username": actor["username"],
            "nickname": user.get("nickname") or safe_nickname(actor["username"]),
            "created_at": now_utc(),
        }
    )
    create_activity_log(actor["username"], "customer", "follow_store", f"{store.get('name')} 팔로우")
    return {"following": True}


def get_admin_events():
    return [serialize_app_event(item) for item in db.app_events.find().sort("created_at", -1)]


def create_admin_event(data: AppEventCreate, actor: str):
    event = {
        "title": data.title.strip(),
        "description": data.description.strip(),
        "emoji": data.emoji.strip(),
        "reward_type": data.rewardType,
        "reward_value": int(data.rewardValue),
        "kind": data.kind,
        "is_active": data.isActive,
        "is_hidden": data.isHidden,
        "created_at": now_utc(),
    }
    result = db.app_events.insert_one(event)
    event["_id"] = result.inserted_id
    create_activity_log(actor, "admin", "create_event", f"{data.title} 이벤트 생성")
    return serialize_app_event(event)


def update_admin_event(event_id: str, data: AppEventUpdate, actor: str):
    event = db.app_events.find_one({"_id": object_id_or_400(event_id, "event id")})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title.strip()
    if data.description is not None:
        update_data["description"] = data.description.strip()
    if data.emoji is not None:
        update_data["emoji"] = data.emoji.strip()
    if data.rewardType is not None:
        update_data["reward_type"] = data.rewardType
    if data.rewardValue is not None:
        update_data["reward_value"] = int(data.rewardValue)
    if data.kind is not None:
        update_data["kind"] = data.kind
    if data.isActive is not None:
        update_data["is_active"] = data.isActive
    if data.isHidden is not None:
        update_data["is_hidden"] = data.isHidden
    if update_data:
        db.app_events.update_one({"_id": event["_id"]}, {"$set": update_data})
        create_activity_log(actor, "admin", "update_event", f"{event.get('title')} 이벤트 수정")
    return serialize_app_event(db.app_events.find_one({"_id": event["_id"]}))


def delete_admin_event(event_id: str, actor: str):
    event = db.app_events.find_one({"_id": object_id_or_400(event_id, "event id")})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.app_events.delete_one({"_id": event["_id"]})
    create_activity_log(actor, "admin", "delete_event", f"{event.get('title')} 이벤트 삭제")
    return {"ok": True}


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
            phone=user.get("phone"),
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
        "nickname": user.get("nickname") or safe_nickname(user["username"]),
        "phone": user.get("phone"),
        "address": user.get("address"),
        "onlineStatus": user.get("onlineStatus"),
        "driverStatus": normalize_driver_status(user) if user.get("role") == "driver" else None,
        "dispatchEnabled": user.get("dispatchEnabled", True),
        "balance": user.get("balance", 0),
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


def get_self_profile(actor: dict):
    user = get_user_by_username(actor["username"])
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=404, detail="Customer not found")
    return serialize_user(user)


def update_self_customer_profile(actor: dict, data: CustomerUpdate):
    user = get_user_by_username(actor["username"])
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=404, detail="Customer not found")
    updated = update_customer(str(user["_id"]), data)
    create_activity_log(actor["username"], "customer", "update_profile", "고객 프로필 수정")
    return updated


def create_notice(data: NoticeCreate, actor: str):
    if data.target not in NOTICE_TARGETS:
        raise HTTPException(status_code=400, detail="유효하지 않은 공지 대상입니다.")
    if not data.title.strip() or not data.content.strip():
        raise HTTPException(status_code=400, detail="제목과 내용을 입력하세요.")

    notice = {
        "title": data.title.strip(),
        "content": data.content.strip(),
        "target": data.target,
        "created_at": now_utc(),
        "created_by": actor,
        "read_by": [],
    }
    result = db.notices.insert_one(notice)
    notice["_id"] = result.inserted_id
    create_activity_log(actor, "admin", "create_notice", f"{data.target} 대상 공지 작성")
    return serialize_notice(notice)


def get_notices_for_role(role: str):
    if role == "admin":
        query = {}
    elif role == "store":
        query = {"target": {"$in": ["all", "store"]}}
    elif role == "driver":
        query = {"target": {"$in": ["all", "driver"]}}
    else:
        query = {"target": "all"}

    return [serialize_notice(item) for item in db.notices.find(query).sort("created_at", -1)]


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

    if update_data:
        db.notices.update_one({"_id": notice["_id"]}, {"$set": update_data})
        create_activity_log(actor, "admin", "update_notice", f"{notice.get('title')} 공지 수정")

    return serialize_notice(db.notices.find_one({"_id": notice["_id"]}))


def delete_notice(notice_id: str, actor: str):
    notice = get_notice_or_404(notice_id)
    db.notices.delete_one({"_id": notice["_id"]})
    create_activity_log(actor, "admin", "delete_notice", f"{notice.get('title')} 공지 삭제")
    return {"ok": True}


def read_notice(notice_id: str, username: str):
    notice = get_notice_or_404(notice_id)
    if username not in notice.get("read_by", []):
        db.notices.update_one({"_id": notice["_id"]}, {"$addToSet": {"read_by": username}})
    return serialize_notice(db.notices.find_one({"_id": notice["_id"]}))


def get_public_stores():
    stores = list(db.stores.find({"approved": True}).sort("created_at", -1))
    results = []
    for store in stores:
        data = serialize_store(store)
        data["followers"] = db.store_follows.count_documents({"store_id": store["_id"]})
        results.append(data)
    return results


def get_store_community(store_id: str, actor: dict | None = None):
    store = get_store_or_404(store_id)
    if not store.get("approved", False):
        raise HTTPException(status_code=404, detail="Store not found")

    story_items = [
        serialize_store_story(item)
        for item in db.store_stories.find({"store_id": store["_id"]}).sort("created_at", -1).limit(20)
    ]
    regular_notes = [
        serialize_store_regular_note(item)
        for item in db.store_regular_notes.find({"store_id": store["_id"]}).sort("created_at", -1).limit(20)
    ]
    album_entries = [
        serialize_store_album_entry(item)
        for item in db.store_album_entries.find({"store_id": store["_id"]}).sort("created_at", -1).limit(24)
    ]
    guestbook_entries = [
        serialize_store_guestbook_entry(item)
        for item in db.store_guestbook_entries.find({"store_id": store["_id"]}).sort("created_at", -1).limit(30)
    ]

    username = actor.get("username") if actor else None
    viewer_badge = get_store_regular_badge(store["_id"], username) if username else {"orderCount": 0, "level": "일반 손님"}
    support_counts = get_store_support_counts(store["_id"])
    support_flags = get_support_flags(store["_id"], username)
    follow_count = db.store_follows.count_documents({"store_id": store["_id"]})
    following_store = bool(username and db.store_follows.find_one({"store_id": store["_id"], "username": username}))

    return {
        "store": serialize_store(store),
        "stats": {
            **support_counts,
            "followers": follow_count,
            "stories": db.store_stories.count_documents({"store_id": store["_id"]}),
            "albums": db.store_album_entries.count_documents({"store_id": store["_id"]}),
            "guestbook": db.store_guestbook_entries.count_documents({"store_id": store["_id"]}),
        },
        "viewer": {
            "username": username,
            "role": actor.get("role") if actor else None,
            "regularLevel": viewer_badge["level"],
            "orderCount": viewer_badge["orderCount"],
            "followingStore": following_store,
            **support_flags,
        },
        "topRegulars": build_monthly_regulars(store["_id"]),
        "ownerStories": story_items,
        "regularNotes": regular_notes,
        "albumEntries": album_entries,
        "guestbookEntries": guestbook_entries,
    }


def toggle_store_support(store_id: str, actor: dict, support_type: str):
    if actor.get("role") != "customer":
        raise HTTPException(status_code=403, detail="손님만 이용할 수 있는 기능입니다.")
    if support_type not in {"like", "cheer", "regular"}:
        raise HTTPException(status_code=400, detail="유효하지 않은 응원 타입입니다.")

    store = get_store_or_404(store_id)
    existing = db.store_supports.find_one(
        {"store_id": store["_id"], "username": actor["username"], "support_type": support_type}
    )
    active = False
    if existing:
        db.store_supports.delete_one({"_id": existing["_id"]})
    else:
        db.store_supports.insert_one(
            {
                "store_id": store["_id"],
                "store_name": store.get("name"),
                "username": actor["username"],
                "support_type": support_type,
                "created_at": now_utc(),
            }
        )
        active = True

    create_activity_log(
        actor["username"],
        actor["role"],
        f"toggle_{support_type}",
        f"{store.get('name')} {support_type} {'등록' if active else '해제'}",
    )
    return {
        "supportType": support_type,
        "active": active,
        "community": get_store_community(store_id, actor),
    }


def create_store_story(store_id: str, actor: dict, data: StoreStoryCreate):
    if actor.get("role") != "store":
        raise HTTPException(status_code=403, detail="사장님만 작성할 수 있습니다.")

    store = get_store_or_404(store_id)
    if store.get("owner") != actor["username"]:
        raise HTTPException(status_code=403, detail="내 가게만 수정할 수 있습니다.")

    if not data.title.strip() or not data.content.strip():
        raise HTTPException(status_code=400, detail="제목과 본문을 입력하세요.")

    story = {
        "store_id": store["_id"],
        "author_name": store.get("name"),
        "title": data.title.strip(),
        "content": data.content.strip(),
        "image_url": data.imageUrl.strip() if data.imageUrl else None,
        "story_type": data.storyType,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = db.store_stories.insert_one(story)
    story["_id"] = result.inserted_id
    create_activity_log(actor["username"], "store", "create_story", f"{store.get('name')} 스토리 작성")
    return serialize_store_story(story)


def update_store_story(story_id: str, actor: dict, data: StoreStoryUpdate):
    if actor.get("role") != "store":
        raise HTTPException(status_code=403, detail="사장님만 수정할 수 있습니다.")

    story = db.store_stories.find_one({"_id": object_id_or_400(story_id, "story id")})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    store = get_store_or_404(str(story["store_id"]))
    if store.get("owner") != actor["username"]:
        raise HTTPException(status_code=403, detail="내 가게만 수정할 수 있습니다.")

    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title.strip()
    if data.content is not None:
        update_data["content"] = data.content.strip()
    if data.imageUrl is not None:
        update_data["image_url"] = data.imageUrl.strip()
    if data.storyType is not None:
        update_data["story_type"] = data.storyType
    update_data["updated_at"] = now_utc()

    db.store_stories.update_one({"_id": story["_id"]}, {"$set": update_data})
    create_activity_log(actor["username"], "store", "update_story", f"{store.get('name')} 스토리 수정")
    return serialize_store_story(db.store_stories.find_one({"_id": story["_id"]}))


def delete_store_story(story_id: str, actor: dict):
    if actor.get("role") != "store":
        raise HTTPException(status_code=403, detail="사장님만 삭제할 수 있습니다.")

    story = db.store_stories.find_one({"_id": object_id_or_400(story_id, "story id")})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    store = get_store_or_404(str(story["store_id"]))
    if store.get("owner") != actor["username"]:
        raise HTTPException(status_code=403, detail="내 가게만 삭제할 수 있습니다.")

    db.store_stories.delete_one({"_id": story["_id"]})
    create_activity_log(actor["username"], "store", "delete_story", f"{store.get('name')} 스토리 삭제")
    return {"message": "deleted"}


def create_regular_note(store_id: str, actor: dict, data: RegularNoteCreate):
    if actor.get("role") != "customer":
        raise HTTPException(status_code=403, detail="손님만 작성할 수 있습니다.")

    if not data.message.strip():
        raise HTTPException(status_code=400, detail="내용을 입력하세요.")

    store = get_store_or_404(store_id)
    regular_badge = get_store_regular_badge(store["_id"], actor["username"])
    note = {
        "store_id": store["_id"],
        "username": actor["username"],
        "author_name": actor["username"],
        "message": data.message.strip(),
        "regular_level": regular_badge["level"],
        "order_count": regular_badge["orderCount"],
        "created_at": now_utc(),
    }
    result = db.store_regular_notes.insert_one(note)
    note["_id"] = result.inserted_id
    create_activity_log(actor["username"], "customer", "create_regular_note", f"{store.get('name')} 단골 한마디 작성")
    return serialize_store_regular_note(note)


def create_album_entry(store_id: str, actor: dict, data: AlbumEntryCreate):
    if actor.get("role") not in {"customer", "store"}:
        raise HTTPException(status_code=403, detail="권한 없음")

    if not data.title.strip() or not data.caption.strip():
        raise HTTPException(status_code=400, detail="제목과 내용을 입력하세요.")

    store = get_store_or_404(store_id)
    author_name = actor["username"]
    if actor.get("role") == "store":
        if store.get("owner") != actor["username"]:
            raise HTTPException(status_code=403, detail="내 가게에만 추억을 남길 수 있습니다.")
        author_name = store.get("name")

    entry = {
        "store_id": store["_id"],
        "author_role": actor["role"],
        "username": actor["username"],
        "author_name": author_name,
        "title": data.title.strip(),
        "caption": data.caption.strip(),
        "image_url": data.imageUrl.strip() if data.imageUrl else None,
        "created_at": now_utc(),
    }
    result = db.store_album_entries.insert_one(entry)
    entry["_id"] = result.inserted_id
    create_activity_log(actor["username"], actor["role"], "create_album_entry", f"{store.get('name')} 추억 앨범 등록")
    return serialize_store_album_entry(entry)


def create_guestbook_entry(store_id: str, actor: dict, data: GuestbookEntryCreate):
    if actor.get("role") != "customer":
        raise HTTPException(status_code=403, detail="손님만 방명록을 작성할 수 있습니다.")
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="내용을 입력하세요.")

    store = get_store_or_404(store_id)
    entry = {
        "store_id": store["_id"],
        "username": actor["username"],
        "author_name": actor["username"],
        "message": data.message.strip(),
        "created_at": now_utc(),
    }
    result = db.store_guestbook_entries.insert_one(entry)
    entry["_id"] = result.inserted_id
    create_activity_log(actor["username"], "customer", "create_guestbook", f"{store.get('name')} 방명록 작성")
    return serialize_store_guestbook_entry(entry)


def get_personalized_feed(actor: dict):
    record_customer_visit(actor)
    visible_stores = [
        store
        for store in db.stores.find({"approved": True}).sort("created_at", -1)
        if is_store_open_now(store)
    ]
    visible_store_ids = [store["_id"] for store in visible_stores]
    store_map = {store["_id"]: store for store in visible_stores}

    posts = list(
        db.content_posts.find({"store_id": {"$in": visible_store_ids}})
        .sort("created_at", -1)
        .limit(30)
    )

    if not posts:
        recent_orders = list(db.orders.find({"user": actor["username"]}).sort("created_at", -1).limit(10))
        favorite_store_ids = [order.get("store_id") for order in recent_orders if order.get("store_id")]
        reason_cycle = [
            "인기 음식",
            "근처 인기 가게",
            "자주 본 메뉴",
            "많이 주문한 음식",
            get_time_based_reason(),
        ]
        generated = []
        for index, store in enumerate(visible_stores):
            menus = list(db.menus.find({"store_id": store["_id"]}).sort("name", 1).limit(3))
            menu = menus[index % len(menus)] if menus else None
            if store["_id"] in favorite_store_ids:
                reason = "자주 주문한 가게 기반 추천"
            else:
                reason = reason_cycle[index % len(reason_cycle)]
            generated.append(serialize_content_post({"_id": ObjectId(), **build_default_content_post(store, menu, index, reason)}))
        return generated

    recent_orders = list(db.orders.find({"user": actor["username"]}).sort("created_at", -1).limit(10))
    frequent_store_names = {order.get("store_name") for order in recent_orders if order.get("store_name")}
    popular_counts = {
        store.get("name"): db.orders.count_documents({"store_id": store["_id"], "status": "completed"})
        for store in visible_stores
    }
    feed = []
    for index, post in enumerate(posts):
        post_store = store_map.get(post.get("store_id"))
        reason = post.get("feed_reason")
        if not reason:
            if post.get("store_name") in frequent_store_names:
                reason = "자주 주문한 음식"
            elif popular_counts.get(post.get("store_name"), 0) >= 3:
                reason = "지금 인기 급상승"
            else:
                reason = get_time_based_reason()
        enriched = {
            **post,
            "feed_reason": reason,
        }
        if post_store:
            enriched["store_name"] = post_store.get("name")
        feed.append(serialize_content_post(enriched))
    return feed


def get_store_content_posts(actor: dict):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return [
        serialize_content_post(item)
        for item in db.content_posts.find({"store_id": store["_id"]}).sort("created_at", -1)
    ]


def create_store_content_post(actor: dict, data: ContentPostCreate):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    post_doc = {
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "title": data.title.strip(),
        "caption": data.caption.strip(),
        "video_url": data.videoUrl.strip(),
        "thumbnail_url": data.thumbnailUrl.strip() if data.thumbnailUrl else None,
        "content_type": data.contentType,
        "menu_name": data.menuName.strip() if data.menuName else None,
        "price": data.price,
        "event_label": data.eventLabel.strip() if data.eventLabel else None,
        "feed_reason": "가게가 직접 올린 최신 영상",
        "likes": 0,
        "saves": 0,
        "views": 0,
        "comments": 0,
        "shares": 0,
        "created_at": now_utc(),
    }
    result = db.content_posts.insert_one(post_doc)
    post_doc["_id"] = result.inserted_id
    create_activity_log(actor["username"], "store", "create_content_post", f"{store.get('name')} 쇼츠 등록")
    return serialize_content_post(post_doc)


def update_store_content_post(post_id: str, actor: dict, data: ContentPostUpdate):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    post = db.content_posts.find_one({"_id": object_id_or_400(post_id, "content post id")})
    if not post or post.get("store_id") != store["_id"]:
        raise HTTPException(status_code=404, detail="Content post not found")

    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title.strip()
    if data.caption is not None:
        update_data["caption"] = data.caption.strip()
    if data.videoUrl is not None:
        update_data["video_url"] = data.videoUrl.strip()
    if data.thumbnailUrl is not None:
        update_data["thumbnail_url"] = data.thumbnailUrl.strip() if data.thumbnailUrl else None
    if data.contentType is not None:
        update_data["content_type"] = data.contentType
    if data.menuName is not None:
        update_data["menu_name"] = data.menuName.strip() if data.menuName else None
    if data.price is not None:
        update_data["price"] = data.price
    if data.eventLabel is not None:
        update_data["event_label"] = data.eventLabel.strip() if data.eventLabel else None

    if update_data:
        db.content_posts.update_one({"_id": post["_id"]}, {"$set": update_data})
    create_activity_log(actor["username"], "store", "update_content_post", f"{store.get('name')} 쇼츠 수정")
    return serialize_content_post(db.content_posts.find_one({"_id": post["_id"]}))


def delete_store_content_post(post_id: str, actor: dict):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    post = db.content_posts.find_one({"_id": object_id_or_400(post_id, "content post id")})
    if not post or post.get("store_id") != store["_id"]:
        raise HTTPException(status_code=404, detail="Content post not found")
    db.content_posts.delete_one({"_id": post["_id"]})
    create_activity_log(actor["username"], "store", "delete_content_post", f"{store.get('name')} 쇼츠 삭제")
    return {"ok": True}


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
        phone=user.get("phone"),
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
    phone = order.phone or actor.get("phone")
    menu_total = calc_total_price(items)
    delivery_fee = int(store.get("deliveryFee", 0) or 0)
    discount_amount = 0
    applied_reward = None
    if order.rewardId:
        reward_doc = db.user_rewards.find_one(
            {
                "_id": object_id_or_400(order.rewardId, "reward id"),
                "username": actor["username"],
                "status": "active",
            }
        )
        if not reward_doc:
            raise HTTPException(status_code=404, detail="사용 가능한 혜택을 찾을 수 없습니다.")
        applied_reward = reward_doc
        if reward_doc.get("reward_type") in {"free_delivery", "store_fee_free"}:
            delivery_fee = 0
        elif reward_doc.get("reward_type") == "discount":
            discount_amount = min(int(reward_doc.get("reward_value", 0) or 0), menu_total + delivery_fee)
    total_price = max(0, menu_total + delivery_fee - discount_amount)
    min_order_amount = int(store.get("minOrderAmount", 0) or 0)
    initial_status = "accepted" if store.get("autoAccept", False) else "pending"
    initial_message = "주문 생성"
    if initial_status == "accepted":
        initial_message = "자동 수락 처리된 주문"
    if not items:
        raise HTTPException(status_code=400, detail="주문 메뉴를 선택하세요.")
    if menu_total < min_order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"최소 주문 금액은 {min_order_amount}원입니다.",
        )

    customer_updates = {}
    if address:
        customer_updates["address"] = address
    if phone:
        customer_updates["phone"] = phone
    if customer_updates:
        db.users.update_one({"username": actor["username"]}, {"$set": customer_updates})

    payment_doc = {
        "payment_id": build_payment_id(),
        "customer_name": actor["username"],
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "amount": total_price,
        "method": order.paymentMethod,
        "status": "paid",
        "created_at": now_utc(),
    }
    payment_result = db.payments.insert_one(payment_doc)
    payment_doc["_id"] = payment_result.inserted_id

    driver_fee = delivery_fee if delivery_fee > 0 else calc_driver_fee(total_price)

    order_doc = {
        "order_id": build_order_id(),
        "created_at": now_utc(),
        "customer_name": actor["username"],
        "user": actor["username"],
        "phone": phone,
        "address": address,
        "items": items,
        "menu_total": menu_total,
        "delivery_fee": delivery_fee,
        "discount_amount": discount_amount,
        "total_price": total_price,
        "status": initial_status,
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "driver_id": None,
        "driver_fee": driver_fee,
        "settlement_amount": 0,
        "payment_id": payment_doc["payment_id"],
        "payment_method": order.paymentMethod,
        "payment_status": "paid",
        "reward_id": str(applied_reward["_id"]) if applied_reward else None,
        "reward_title": applied_reward.get("title") if applied_reward else None,
        "status_logs": [status_log_entry(initial_status, actor["username"], initial_message)],
        "rejected_drivers": [],
    }
    result = db.orders.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    db.payments.update_one({"_id": payment_doc["_id"]}, {"$set": {"order_id": order_doc["order_id"]}})

    create_activity_log(actor["username"], actor["role"], "create_order", f"{order_doc['order_id']} 주문 생성")
    create_transaction_log(
        "payment",
        total_price,
        actor["username"],
        actor["role"],
        store.get("name"),
        "store",
        f"{order_doc['order_id']} 결제 완료",
        related_id=order_doc["order_id"],
    )
    if applied_reward:
        db.user_rewards.update_one(
            {"_id": applied_reward["_id"]},
            {"$set": {"status": "used", "used_at": now_utc()}},
        )
    evaluate_customer_stickers(actor["username"], store, items, order_doc["created_at"])
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
    next_status = data.status
    previous_driver = order.get("driver_id")

    if next_status in {"assigned", "delivering"} and not previous_driver:
        raise HTTPException(status_code=400, detail="기사 배정 없이 해당 상태로 변경할 수 없습니다.")

    update_data: dict[str, object] = {"status": next_status}
    if next_status in {"pending", "accepted", "dispatch_ready", "cancelled"}:
        update_data["driver_id"] = None

    db.orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": update_data,
            "$push": {"status_logs": status_log_entry(next_status, actor, "관리자 상태 변경")},
        },
    )

    if previous_driver and next_status in {"assigned", "delivering"}:
        previous_user = get_user_by_username(previous_driver)
        if previous_user:
            db.users.update_one(
                {"_id": previous_user["_id"]},
                {"$set": {"driverStatus": "delivering", "onlineStatus": "online"}},
            )

    if previous_driver and next_status in {"pending", "accepted", "dispatch_ready", "completed", "cancelled"}:
        previous_user = get_user_by_username(previous_driver)
        if previous_user and get_driver_active_order_count(previous_driver) == 0:
            db.users.update_one(
                {"_id": previous_user["_id"]},
                {"$set": {"driverStatus": "idle", "onlineStatus": "online"}},
            )

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
    if order.get("status") != "pending":
        raise HTTPException(status_code=400, detail="접수 주문만 수락할 수 있습니다.")
    append_order_status(order, "accepted", actor["username"], "가게가 주문을 수락했습니다.")
    create_activity_log(actor["username"], "store", "store_accept", f"{order.get('order_id')} 주문 수락")
    return {"message": "store accepted"}


def store_reject(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    _validate_store_order(order, actor)
    if order.get("status") not in {"pending", "accepted"}:
        raise HTTPException(status_code=400, detail="현재 상태에서는 주문을 거절할 수 없습니다.")
    append_order_status(order, "cancelled", actor["username"], "가게가 주문을 거절했습니다.")
    create_activity_log(actor["username"], "store", "store_reject", f"{order.get('order_id')} 주문 거절")
    return {"message": "rejected"}


def store_dispatch(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    _validate_store_order(order, actor)
    if order.get("status") != "accepted":
        raise HTTPException(status_code=400, detail="가게 수락 완료 주문만 배차 요청할 수 있습니다.")
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
    user = get_user_by_username(username)
    return STATUS_TO_KOREAN.get(normalize_driver_status(user), "오프라인")


def driver_accept(order_id: str, actor: dict):
    driver_user = get_user_by_username(actor["username"])
    driver_status = normalize_driver_status(driver_user)
    if driver_status != "idle":
        raise HTTPException(status_code=400, detail="대기중 상태의 기사만 배차를 수락할 수 있습니다.")
    if driver_user and not driver_user.get("dispatchEnabled", True):
        raise HTTPException(status_code=400, detail="배차 수신이 꺼져 있습니다.")
    if get_driver_active_order_count(actor["username"]) > 0:
        raise HTTPException(status_code=400, detail="이미 진행 중인 주문이 있습니다.")

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
    if driver_user:
        db.users.update_one(
            {"_id": driver_user["_id"]},
            {"$set": {"driverStatus": "delivering", "onlineStatus": "online"}},
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
    if order.get("status") != "assigned":
        raise HTTPException(status_code=400, detail="배달 시작 가능한 상태가 아닙니다.")
    append_order_status(order, "delivering", actor["username"], "배달 시작")
    create_activity_log(actor["username"], "driver", "start_delivery", f"{order.get('order_id')} 배달 시작")
    return {"message": "started"}


def driver_complete(order_id: str, actor: dict):
    order = get_order_or_404(order_id)
    if order.get("driver_id") != actor["username"]:
        raise HTTPException(status_code=403, detail="본인 배달만 완료할 수 있습니다.")
    if order.get("status") not in {"assigned", "delivering"}:
        raise HTTPException(status_code=400, detail="배달 완료 가능한 상태가 아닙니다.")
    append_order_status(order, "completed", actor["username"], "배달 완료")
    store = db.stores.find_one({"_id": order.get("store_id")}) if order.get("store_id") else None
    driver_fee = int(order.get("driver_fee", 0) or 0)
    total_price = int(order.get("total_price", 0) or 0)
    menu_total = int(order.get("menu_total", 0) or 0)
    delivery_fee = int(order.get("delivery_fee", 0) or 0)
    settlement_amount = max(menu_total - delivery_fee, 0)

    if store:
        db.stores.update_one(
            {"_id": store["_id"]},
            {
                "$inc": {
                    "pendingSettlement": settlement_amount,
                    "balance": settlement_amount,
                }
            },
        )
        create_transaction_log(
            "settlement",
            settlement_amount,
            actor["username"],
            "driver",
            store.get("name"),
            "store",
            f"{order.get('order_id')} 가게 정산 적립",
            related_id=order.get("order_id"),
        )
        if delivery_fee > 0:
            create_transaction_log(
                "delivery_fee",
                delivery_fee,
                store.get("name"),
                "store",
                actor["username"],
                "driver",
                f"{order.get('order_id')} 배달비 차감",
                related_id=order.get("order_id"),
            )

    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"settlement_amount": settlement_amount}},
    )
    db.users.update_one(
        {"username": actor["username"]},
        {"$inc": {"balance": driver_fee}, "$set": {"driverStatus": "idle", "onlineStatus": "online"}},
    )
    create_transaction_log(
        "driver_earning",
        driver_fee,
        store.get("name") if store else "system",
        "store",
        actor["username"],
        "driver",
        f"{order.get('order_id')} 기사 수익 적립",
        related_id=order.get("order_id"),
    )
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


def build_dispatch_board():
    orders = [serialize_order(order) for order in db.orders.find().sort("created_at", -1)]
    return {
        "pending": [order for order in orders if order["status"] == "pending"],
        "dispatch_ready": [order for order in orders if order["status"] in {"accepted", "dispatch_ready"}],
        "delivering": [order for order in orders if order["status"] in {"assigned", "delivering"}],
        "completed": [order for order in orders if order["status"] == "completed"],
        "cancelled": [order for order in orders if order["status"] == "cancelled"],
    }


def get_dispatchable_drivers():
    drivers = []
    for driver in get_drivers():
        driver["canDispatch"] = (
            driver.get("approved", False)
            and driver.get("dispatchEnabled", True)
            and driver.get("driverStatus") == "idle"
            and driver.get("activeOrderCount", 0) == 0
        )
        drivers.append(driver)
    return drivers


def get_admin_dispatch_board():
    return {
        "queues": build_dispatch_board(),
        "drivers": get_dispatchable_drivers(),
    }


def validate_driver_for_assignment(driver: dict):
    if not driver.get("approved", False):
        raise HTTPException(status_code=400, detail="승인된 기사만 배정할 수 있습니다.")
    if not driver.get("dispatchEnabled", True):
        raise HTTPException(status_code=400, detail="배차 수신이 꺼진 기사입니다.")
    if normalize_driver_status(driver) != "idle":
        raise HTTPException(status_code=400, detail="대기중 기사만 배정할 수 있습니다.")
    if get_driver_active_order_count(driver.get("username")) > 0:
        raise HTTPException(status_code=400, detail="이미 진행 중인 주문이 있는 기사입니다.")


def validate_driver_status_transition(username: str, next_status: str):
    active_order_count = get_driver_active_order_count(username)
    if active_order_count > 0 and next_status != "delivering":
        raise HTTPException(status_code=400, detail="진행 중 주문이 있는 기사는 배달중 상태를 유지해야 합니다.")
    if active_order_count == 0 and next_status == "delivering":
        raise HTTPException(status_code=400, detail="진행 중 주문 없이 배달중으로 변경할 수 없습니다.")


def assign_driver_to_order(order_id: str, payload: ManualDispatchPayload, actor: str, reassign: bool = False):
    order = get_order_or_404(order_id)
    allowed_statuses = {"dispatch_ready", "accepted"}
    if reassign:
        allowed_statuses = {"dispatch_ready", "assigned"}
    if order.get("status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail="현재 상태에서는 기사 배정이 불가능합니다.")

    driver = get_user_by_username(payload.driverUsername)
    if not driver or driver.get("role") != "driver":
        raise HTTPException(status_code=404, detail="기사 정보를 찾을 수 없습니다.")
    validate_driver_for_assignment(driver)

    previous_driver = order.get("driver_id")
    db.orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {
                "driver_id": driver.get("username"),
                "status": "assigned",
                "rejected_drivers": [],
            },
            "$push": {
                "status_logs": status_log_entry(
                    "assigned",
                    actor,
                    f"관리자가 {driver.get('username')} 기사로 {'재배차' if reassign else '배정'}했습니다.",
                )
            },
        },
    )
    db.users.update_one(
        {"_id": driver["_id"]},
        {"$set": {"driverStatus": "delivering", "onlineStatus": "online"}},
    )
    if reassign and previous_driver and previous_driver != driver.get("username"):
        previous_user = get_user_by_username(previous_driver)
        if previous_user and get_driver_active_order_count(previous_driver) <= 1:
            db.users.update_one(
                {"_id": previous_user["_id"]},
                {"$set": {"driverStatus": "idle", "onlineStatus": "online"}},
            )

    create_activity_log(actor, "admin", "manual_dispatch", f"{order.get('order_id')} -> {driver.get('username')}")
    return serialize_order(db.orders.find_one({"_id": order["_id"]}))


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
        active_order_count = get_driver_active_order_count(driver.get("username"))
        data["currentDeliveryStatus"] = get_driver_current_status(driver.get("username"))
        data["activeOrderCount"] = active_order_count
        data["earnings"] = sum(order.get("driver_fee", 0) for order in completed_orders)
        data["deliveries"] = len(completed_orders)
        data["todayDeliveries"] = len([order for order in completed_orders if is_today(order.get("created_at"))])
        data["todayEarnings"] = sum(order.get("driver_fee", 0) for order in completed_orders if is_today(order.get("created_at")))
        data["orders"] = [serialize_order(order) for order in orders]
        drivers.append(data)
    return drivers


def create_driver(data: UserCreate):
    return serialize_user(
        create_user(
            data.username,
            data.password,
            data.phone,
            "driver",
            approved=True,
            onlineStatus="offline",
            driverStatus="offline",
        )
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
        mapped_status = "idle" if data.onlineStatus == "online" else "offline"
        validate_driver_status_transition(driver.get("username"), mapped_status)
        update_data["onlineStatus"] = data.onlineStatus
        update_data["driverStatus"] = mapped_status
    if data.driverStatus is not None:
        if data.driverStatus not in DRIVER_OPERATION_STATUSES:
            raise HTTPException(status_code=400, detail="유효하지 않은 기사 상태입니다.")
        validate_driver_status_transition(driver.get("username"), data.driverStatus)
        update_data["driverStatus"] = data.driverStatus
        update_data["onlineStatus"] = driver_online_label(data.driverStatus)
    if data.dispatchEnabled is not None:
        update_data["dispatchEnabled"] = data.dispatchEnabled
    if data.approved is not None:
        update_data["approved"] = data.approved

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
    if data.nickname is not None:
        update_data["nickname"] = data.nickname.strip()

    db.users.update_one({"_id": customer["_id"]}, {"$set": update_data})
    return serialize_user(db.users.find_one({"_id": customer["_id"]}))


def get_stats():
    orders = list(db.orders.find())
    total_orders = len(orders)
    total_sales = sum(order.get("total_price", 0) for order in orders if order.get("status") == "completed")
    today_orders = sum(1 for order in orders if is_today(order.get("created_at")))
    today_delivery_fee_revenue = sum(
        int(order.get("delivery_fee", 0) or 0)
        for order in orders
        if order.get("status") == "completed" and is_today(order.get("created_at"))
    )
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
        "totalOrders": total_orders,
        "totalSales": total_sales,
        "todayOrders": today_orders,
        "todayDeliveryFeeRevenue": today_delivery_fee_revenue,
        "dispatchReadyOrders": status_count.get("accepted", 0) + status_count.get("dispatch_ready", 0),
        "deliveringOrders": status_count.get("assigned", 0) + status_count.get("delivering", 0),
        "pendingOrders": status_count.get("pending", 0),
        "acceptedOrders": status_count.get("accepted", 0),
        "assignedOrders": status_count.get("assigned", 0),
        "completedOrders": status_count.get("completed", 0),
        "cancelledOrders": status_count.get("cancelled", 0),
        "onlineDrivers": len(
            [
                driver
                for driver in db.users.find({"role": "driver"})
                if normalize_driver_status(driver) in {"idle", "delivering", "resting"}
            ]
        ),
        "store_sales": store_sales,
        "status_count": status_count,
    }


def get_finance_overview():
    completed_orders = list(db.orders.find({"status": "completed"}))
    stores = [serialize_store(store, include_internal=True) for store in db.stores.find().sort("name", 1)]
    drivers = [serialize_user(driver) for driver in db.users.find({"role": "driver"}).sort("username", 1)]

    store_settlements = [
        {
            "store_id": store["_id"],
            "store_name": store["name"],
            "balance": store.get("balance", 0),
            "pendingSettlement": store.get("pendingSettlement", 0),
            "totalSales": sum(
                order.get("menu_total", order.get("total_price", 0))
                for order in completed_orders
                if order.get("store_name") == store["name"]
            ),
            "withdrawnAmount": sum(
                item.get("amount", 0)
                for item in db.store_withdrawal_requests.find(
                    {"store_id": object_id_or_400(store["_id"], "store id"), "status": "approved"}
                )
            ),
        }
        for store in stores
    ]
    driver_balances = [
        {
            "driver_id": driver["_id"],
            "driver_username": driver["username"],
            "balance": driver.get("balance", 0),
            "bankName": driver.get("bankName"),
            "accountNumber": driver.get("accountNumber"),
            "todayEarnings": sum(
                order.get("driver_fee", 0)
                for order in completed_orders
                if order.get("driver_id") == driver["username"] and is_today(order.get("created_at"))
            ),
            "totalEarnings": sum(
                order.get("driver_fee", 0)
                for order in completed_orders
                if order.get("driver_id") == driver["username"]
            ),
        }
        for driver in drivers
    ]

    return {
        "totalRevenue": sum(order.get("total_price", 0) for order in completed_orders),
        "pendingTopups": db.topup_requests.count_documents({"status": "pending"}),
        "pendingWithdrawals": db.withdrawal_requests.count_documents({"status": "pending"}),
        "pendingStoreWithdrawals": db.store_withdrawal_requests.count_documents({"status": "pending"}),
        "storeSettlements": store_settlements,
        "driverBalances": driver_balances,
        "recentTransactions": [
            serialize_transaction(item)
            for item in db.transactions.find().sort("created_at", -1).limit(20)
        ],
    }


def get_topup_requests(status: str | None = None):
    query = {}
    if status:
        query["status"] = status
    return [
        serialize_topup_request(item)
        for item in db.topup_requests.find(query).sort("created_at", -1)
    ]


def approve_topup_request(request_id: str, actor: str, note: str | None = None):
    request_doc = db.topup_requests.find_one({"_id": object_id_or_400(request_id, "topup request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Topup request not found")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 충전 요청입니다.")

    db.topup_requests.update_one(
        {"_id": request_doc["_id"]},
        {"$set": {"status": "approved", "adminNote": note, "processed_at": now_utc()}},
    )
    db.stores.update_one({"_id": request_doc["store_id"]}, {"$inc": {"balance": int(request_doc.get("amount", 0))}})
    create_activity_log(actor, "admin", "approve_topup", f"{request_doc.get('store_name')} 충전 승인")
    create_transaction_log(
        "topup_approved",
        int(request_doc.get("amount", 0)),
        actor,
        "admin",
        request_doc.get("store_name"),
        "store",
        "가게 충전 승인",
        related_id=str(request_doc["_id"]),
    )
    return serialize_topup_request(db.topup_requests.find_one({"_id": request_doc["_id"]}))


def reject_topup_request(request_id: str, actor: str, note: str | None = None):
    request_doc = db.topup_requests.find_one({"_id": object_id_or_400(request_id, "topup request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Topup request not found")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 충전 요청입니다.")

    db.topup_requests.update_one(
        {"_id": request_doc["_id"]},
        {"$set": {"status": "rejected", "adminNote": note, "processed_at": now_utc()}},
    )
    create_activity_log(actor, "admin", "reject_topup", f"{request_doc.get('store_name')} 충전 거절")
    create_transaction_log(
        "topup_rejected",
        int(request_doc.get("amount", 0)),
        actor,
        "admin",
        request_doc.get("store_name"),
        "store",
        "가게 충전 거절",
        related_id=str(request_doc["_id"]),
        status="rejected",
    )
    return serialize_topup_request(db.topup_requests.find_one({"_id": request_doc["_id"]}))


def get_withdrawal_requests(status: str | None = None):
    query = {}
    if status:
        query["status"] = status
    return [
        serialize_withdrawal_request(item)
        for item in db.withdrawal_requests.find(query).sort("created_at", -1)
    ]


def approve_withdrawal_request(request_id: str, actor: str, note: str | None = None):
    request_doc = db.withdrawal_requests.find_one({"_id": object_id_or_400(request_id, "withdrawal request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 출금 요청입니다.")

    driver = db.users.find_one({"_id": request_doc["driver_id"]})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if int(driver.get("balance", 0) or 0) < int(request_doc.get("amount", 0) or 0):
        raise HTTPException(status_code=400, detail="기사 잔액이 부족합니다.")

    db.withdrawal_requests.update_one(
        {"_id": request_doc["_id"]},
        {"$set": {"status": "approved", "adminNote": note, "processed_at": now_utc()}},
    )
    db.users.update_one({"_id": driver["_id"]}, {"$inc": {"balance": -int(request_doc.get("amount", 0))}})
    create_activity_log(actor, "admin", "approve_withdrawal", f"{request_doc.get('driver_username')} 출금 승인")
    create_transaction_log(
        "withdrawal_approved",
        int(request_doc.get("amount", 0)),
        actor,
        "admin",
        request_doc.get("driver_username"),
        "driver",
        "기사 출금 승인",
        related_id=str(request_doc["_id"]),
    )
    return serialize_withdrawal_request(db.withdrawal_requests.find_one({"_id": request_doc["_id"]}))


def reject_withdrawal_request(request_id: str, actor: str, note: str | None = None):
    request_doc = db.withdrawal_requests.find_one({"_id": object_id_or_400(request_id, "withdrawal request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 출금 요청입니다.")

    db.withdrawal_requests.update_one(
        {"_id": request_doc["_id"]},
        {"$set": {"status": "rejected", "adminNote": note, "processed_at": now_utc()}},
    )
    create_activity_log(actor, "admin", "reject_withdrawal", f"{request_doc.get('driver_username')} 출금 거절")
    create_transaction_log(
        "withdrawal_rejected",
        int(request_doc.get("amount", 0)),
        actor,
        "admin",
        request_doc.get("driver_username"),
        "driver",
        "기사 출금 거절",
        related_id=str(request_doc["_id"]),
        status="rejected",
    )
    return serialize_withdrawal_request(db.withdrawal_requests.find_one({"_id": request_doc["_id"]}))


def get_transactions(limit: int = 100):
    return [
        serialize_transaction(item)
        for item in db.transactions.find().sort("created_at", -1).limit(limit)
    ]


def get_store_withdrawal_requests(status: str | None = None):
    query = {}
    if status:
        query["status"] = status
    return [
        serialize_store_withdrawal_request(item)
        for item in db.store_withdrawal_requests.find(query).sort("created_at", -1)
    ]


def approve_store_withdrawal_request(request_id: str, actor: str, note: str | None = None):
    request_doc = db.store_withdrawal_requests.find_one({"_id": object_id_or_400(request_id, "store withdrawal request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Store withdrawal request not found")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 출금 요청입니다.")

    store = db.stores.find_one({"_id": request_doc["store_id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if int(store.get("balance", 0) or 0) < int(request_doc.get("amount", 0) or 0):
        raise HTTPException(status_code=400, detail="가게 잔액이 부족합니다.")

    db.store_withdrawal_requests.update_one(
        {"_id": request_doc["_id"]},
        {"$set": {"status": "approved", "adminNote": note, "processed_at": now_utc()}},
    )
    db.stores.update_one({"_id": store["_id"]}, {"$inc": {"balance": -int(request_doc.get("amount", 0))}})
    create_activity_log(actor, "admin", "approve_store_withdrawal", f"{request_doc.get('store_name')} 출금 승인")
    create_transaction_log(
        "store_withdrawal_approved",
        int(request_doc.get("amount", 0)),
        actor,
        "admin",
        request_doc.get("store_name"),
        "store",
        "가게 출금 승인",
        related_id=str(request_doc["_id"]),
    )
    return serialize_store_withdrawal_request(db.store_withdrawal_requests.find_one({"_id": request_doc["_id"]}))


def reject_store_withdrawal_request(request_id: str, actor: str, note: str | None = None):
    request_doc = db.store_withdrawal_requests.find_one({"_id": object_id_or_400(request_id, "store withdrawal request id")})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Store withdrawal request not found")
    if request_doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 출금 요청입니다.")

    db.store_withdrawal_requests.update_one(
        {"_id": request_doc["_id"]},
        {"$set": {"status": "rejected", "adminNote": note, "processed_at": now_utc()}},
    )
    create_activity_log(actor, "admin", "reject_store_withdrawal", f"{request_doc.get('store_name')} 출금 거절")
    create_transaction_log(
        "store_withdrawal_rejected",
        int(request_doc.get("amount", 0)),
        actor,
        "admin",
        request_doc.get("store_name"),
        "store",
        "가게 출금 거절",
        related_id=str(request_doc["_id"]),
        status="rejected",
    )
    return serialize_store_withdrawal_request(db.store_withdrawal_requests.find_one({"_id": request_doc["_id"]}))


def adjust_store_balance(store_id: str, amount: int, actor: str, note: str | None = None):
    store = get_store_or_404(store_id)
    db.stores.update_one({"_id": store["_id"]}, {"$inc": {"balance": int(amount)}})
    create_activity_log(actor, "admin", "adjust_store_balance", f"{store.get('name')} 잔액 {amount} 조정")
    create_transaction_log(
        "store_balance_adjust",
        amount,
        actor,
        "admin",
        store.get("name"),
        "store",
        note or "가게 잔액 수동 조정",
        related_id=str(store["_id"]),
    )
    return serialize_store(db.stores.find_one({"_id": store["_id"]}), include_internal=True)


def adjust_driver_balance(driver_id: str, amount: int, actor: str, note: str | None = None):
    driver = get_user_or_404(driver_id)
    if driver.get("role") != "driver":
        raise HTTPException(status_code=400, detail="기사 계정이 아닙니다.")
    db.users.update_one({"_id": driver["_id"]}, {"$inc": {"balance": int(amount)}})
    create_activity_log(actor, "admin", "adjust_driver_balance", f"{driver.get('username')} 잔액 {amount} 조정")
    create_transaction_log(
        "driver_balance_adjust",
        amount,
        actor,
        "admin",
        driver.get("username"),
        "driver",
        note or "기사 잔액 수동 조정",
        related_id=str(driver["_id"]),
    )
    return serialize_user(db.users.find_one({"_id": driver["_id"]}))


def update_driver_online_status(actor: dict, data: DriverOnlineUpdate):
    next_status = data.driverStatus
    if not next_status and data.onlineStatus:
        next_status = "idle" if data.onlineStatus == "online" else "offline"
    if next_status not in DRIVER_OPERATION_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 기사 상태입니다.")
    validate_driver_status_transition(actor["username"], next_status)
    db.users.update_one(
        {"username": actor["username"]},
        {"$set": {"driverStatus": next_status, "onlineStatus": driver_online_label(next_status)}},
    )
    create_activity_log(actor["username"], "driver", "toggle_driver_status", f"기사 상태를 {next_status} 로 변경")
    return get_driver_settings(actor)


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
        "driverStatus": normalize_driver_status(driver_user),
        "dispatchEnabled": driver_user.get("dispatchEnabled", True) if driver_user else True,
        "balance": driver_user.get("balance", 0) if driver_user else 0,
        "todayDeliveries": len(completed_today),
        "todayEarnings": sum(order.get("driver_fee", 0) for order in completed_today),
        "currentStatus": get_driver_current_status(actor["username"]),
        "currentOrder": serialize_order(current_order) if current_order else None,
    }


def get_driver_available_orders(actor: dict):
    driver_user = get_user_by_username(actor["username"])
    if (
        not driver_user
        or normalize_driver_status(driver_user) != "idle"
        or not driver_user.get("dispatchEnabled", True)
    ):
        return []
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


def get_driver_settings(actor: dict):
    driver = get_user_by_username(actor["username"])
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    requests = [
        serialize_withdrawal_request(item)
        for item in db.withdrawal_requests.find({"driver_username": actor["username"]}).sort("created_at", -1)
    ]

    return {
        **serialize_user(driver),
        "driverStatusLabel": STATUS_TO_KOREAN.get(normalize_driver_status(driver), "오프라인"),
        "withdrawalRequests": requests,
    }


def update_driver_settings(actor: dict, data: DriverSettingsUpdate):
    driver = get_user_by_username(actor["username"])
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = {}
    if data.phone is not None:
        update_data["phone"] = data.phone.strip()
    if data.onlineStatus is not None:
        if data.onlineStatus not in DRIVER_ONLINE_STATUSES:
            raise HTTPException(status_code=400, detail="유효하지 않은 온라인 상태입니다.")
        update_data["onlineStatus"] = data.onlineStatus
        update_data["driverStatus"] = "idle" if data.onlineStatus == "online" else "offline"
    if data.driverStatus is not None:
        if data.driverStatus not in DRIVER_OPERATION_STATUSES:
            raise HTTPException(status_code=400, detail="유효하지 않은 기사 상태입니다.")
        validate_driver_status_transition(actor["username"], data.driverStatus)
        update_data["driverStatus"] = data.driverStatus
        update_data["onlineStatus"] = driver_online_label(data.driverStatus)
    if data.dispatchEnabled is not None:
        update_data["dispatchEnabled"] = data.dispatchEnabled
    if data.bankName is not None:
        update_data["bankName"] = data.bankName.strip()
    if data.accountNumber is not None:
        update_data["accountNumber"] = data.accountNumber.strip()
    if data.accountHolder is not None:
        update_data["accountHolder"] = data.accountHolder.strip()

    if update_data:
        db.users.update_one({"_id": driver["_id"]}, {"$set": update_data})
        create_activity_log(actor["username"], "driver", "update_driver_settings", "기사 설정 수정")

    return get_driver_settings(actor)


def request_driver_withdrawal(actor: dict, data: DriverWithdrawalRequestCreate):
    driver = get_user_by_username(actor["username"])
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="출금 금액은 0보다 커야 합니다.")
    if int(driver.get("balance", 0) or 0) < data.amount:
        raise HTTPException(status_code=400, detail="출금 가능 금액이 부족합니다.")
    if not driver.get("bankName") or not driver.get("accountNumber") or not driver.get("accountHolder"):
        raise HTTPException(status_code=400, detail="출금 전 계좌 정보를 먼저 등록하세요.")

    request_doc = {
        "driver_id": driver["_id"],
        "driver_username": actor["username"],
        "amount": int(data.amount),
        "status": "pending",
        "note": data.note,
        "adminNote": None,
        "bankName": driver.get("bankName"),
        "accountNumber": driver.get("accountNumber"),
        "accountHolder": driver.get("accountHolder"),
        "created_at": now_utc(),
        "processed_at": None,
    }
    result = db.withdrawal_requests.insert_one(request_doc)
    request_doc["_id"] = result.inserted_id
    create_activity_log(actor["username"], "driver", "request_withdrawal", f"{data.amount}원 출금 요청")
    create_transaction_log(
        "withdraw_request",
        data.amount,
        actor["username"],
        "driver",
        "admin",
        "admin",
        "기사 출금 요청",
        related_id=str(request_doc["_id"]),
        status="pending",
    )
    return serialize_withdrawal_request(request_doc)


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
    support_counts = get_store_support_counts(store["_id"])

    return {
        "todaySales": sum(order.get("total_price", 0) for order in completed_orders if is_today(order.get("created_at"))),
        "totalSales": sum(order.get("total_price", 0) for order in completed_orders),
        "totalOrders": len(orders),
        "completedOrders": len(completed_orders),
        "cancelledOrders": len([order for order in orders if order.get("status") == "cancelled"]),
        "pendingSettlement": store.get("pendingSettlement", 0),
        "balance": store.get("balance", 0),
        "likes": support_counts["likes"],
        "cheers": support_counts["cheers"],
        "regulars": support_counts["regulars"],
        "orders": [serialize_order(order) for order in orders[:20]],
    }


def get_store_my_info(actor: dict):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    menus = [serialize_menu(menu) for menu in db.menus.find({"store_id": store["_id"]}).sort("name", 1)]
    support_counts = get_store_support_counts(store["_id"])
    return {
        **serialize_store(store, include_internal=True),
        "menus": menus,
        "currentOrderCount": get_store_current_order_count(store["_id"]),
        "communityStats": {
            **support_counts,
            "followers": db.store_follows.count_documents({"store_id": store["_id"]}),
            "stories": db.store_stories.count_documents({"store_id": store["_id"]}),
            "albums": db.store_album_entries.count_documents({"store_id": store["_id"]}),
            "guestbook": db.store_guestbook_entries.count_documents({"store_id": store["_id"]}),
        },
        "followersPreview": [
            serialize_follow(item)
            for item in db.store_follows.find({"store_id": store["_id"]}).sort("created_at", -1).limit(8)
        ],
        "topupRequests": [
            serialize_topup_request(item)
            for item in db.topup_requests.find({"store_id": store["_id"]}).sort("created_at", -1).limit(10)
        ],
    }


def update_store_settings(actor: dict, data: StoreSettingsUpdate):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name.strip()
    if data.description is not None:
        update_data["description"] = data.description.strip()
    if data.phone is not None:
        update_data["phone"] = data.phone.strip()
        db.users.update_one({"username": actor["username"]}, {"$set": {"phone": data.phone.strip()}})
    if data.minOrderAmount is not None:
        update_data["minOrderAmount"] = int(data.minOrderAmount)
    if data.deliveryFee is not None:
        update_data["deliveryFee"] = int(data.deliveryFee)
    if data.bankName is not None:
        update_data["bankName"] = data.bankName.strip()
    if data.accountNumber is not None:
        update_data["accountNumber"] = data.accountNumber.strip()
    if data.accountHolder is not None:
        update_data["accountHolder"] = data.accountHolder.strip()
    if data.openTime is not None:
        update_data["openTime"] = data.openTime
    if data.closeTime is not None:
        update_data["closeTime"] = data.closeTime
    if data.isOpen is not None:
        update_data["isOpen"] = data.isOpen
    if data.autoAccept is not None:
        update_data["autoAccept"] = data.autoAccept

    if update_data:
        db.stores.update_one({"_id": store["_id"]}, {"$set": update_data})
        create_activity_log(actor["username"], "store", "update_store_settings", "가게 설정 수정")

    return get_store_my_info(actor)


def get_store_finance(actor: dict):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    payments = [
        serialize_payment(item)
        for item in db.payments.find({"store_id": store["_id"]}).sort("created_at", -1).limit(20)
    ]
    topup_requests = [
        serialize_topup_request(item)
        for item in db.topup_requests.find({"store_id": store["_id"]}).sort("created_at", -1)
    ]
    withdrawal_requests = [
        serialize_store_withdrawal_request(item)
        for item in db.store_withdrawal_requests.find({"store_id": store["_id"]}).sort("created_at", -1)
    ]
    transactions = [
        serialize_transaction(item)
        for item in db.transactions.find({"$or": [{"actor": store.get("name")}, {"target": store.get("name")}]}).sort("created_at", -1).limit(30)
    ]

    return {
        "balance": store.get("balance", 0),
        "pendingSettlement": store.get("pendingSettlement", 0),
        "payments": payments,
        "topupRequests": topup_requests,
        "withdrawalRequests": withdrawal_requests,
        "transactions": transactions,
    }


def request_store_topup(actor: dict, data: StoreTopupRequestCreate):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="충전 금액은 0보다 커야 합니다.")

    request_doc = {
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "owner": actor["username"],
        "amount": int(data.amount),
        "depositorName": data.depositorName.strip(),
        "status": "pending",
        "note": data.note,
        "adminNote": None,
        "created_at": now_utc(),
        "processed_at": None,
    }
    result = db.topup_requests.insert_one(request_doc)
    request_doc["_id"] = result.inserted_id
    create_activity_log(actor["username"], "store", "request_topup", f"{data.amount}원 충전 요청")
    create_transaction_log(
        "topup_request",
        data.amount,
        actor["username"],
        "store",
        "admin",
        "admin",
        "가게 충전 요청",
        related_id=str(request_doc["_id"]),
        status="pending",
    )
    return serialize_topup_request(request_doc)


def request_store_withdrawal(actor: dict, data: StoreWithdrawalRequestCreate):
    store = get_store_by_owner(actor["username"])
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="출금 금액은 0보다 커야 합니다.")
    if int(store.get("balance", 0) or 0) < data.amount:
        raise HTTPException(status_code=400, detail="가게 잔액이 부족합니다.")
    if not store.get("bankName") or not store.get("accountNumber") or not store.get("accountHolder"):
        raise HTTPException(status_code=400, detail="출금 전 계좌 정보를 먼저 등록하세요.")

    request_doc = {
        "store_id": store["_id"],
        "store_name": store.get("name"),
        "owner": actor["username"],
        "amount": int(data.amount),
        "status": "pending",
        "note": data.note,
        "adminNote": None,
        "bankName": store.get("bankName"),
        "accountNumber": store.get("accountNumber"),
        "accountHolder": store.get("accountHolder"),
        "created_at": now_utc(),
        "processed_at": None,
    }
    result = db.store_withdrawal_requests.insert_one(request_doc)
    request_doc["_id"] = result.inserted_id
    create_activity_log(actor["username"], "store", "request_store_withdrawal", f"{data.amount}원 출금 요청")
    create_transaction_log(
        "store_withdraw_request",
        data.amount,
        actor["username"],
        "store",
        "admin",
        "admin",
        "가게 출금 요청",
        related_id=str(request_doc["_id"]),
        status="pending",
    )
    return serialize_store_withdrawal_request(request_doc)


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
