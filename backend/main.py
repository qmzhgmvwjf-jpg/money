from datetime import datetime

import bcrypt
from bson import ObjectId
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from pydantic import BaseModel
from pymongo import MongoClient

app = FastAPI()

print("🔥 ADMIN SYSTEM VERSION DEPLOYED 🔥")


@app.get("/")
def home():
    return {"message": "server running"}


# =========================
# 🔐 설정
# =========================
SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"
security = HTTPBearer()

REGISTER_ROLES = {"customer", "store", "driver"}
ALL_ROLES = {"admin", "customer", "store", "driver"}
ORDER_STATUSES = {
    "pending",
    "accepted",
    "dispatch_ready",
    "assigned",
    "delivering",
    "completed",
}
NOTICE_TARGETS = {"all", "store", "driver"}
STORE_STATUSES = {"open", "closed"}


# =========================
# 🔥 CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def force_cors(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.options("/{path:path}")
async def options_handler(path: str):
    return JSONResponse(content={"ok": True})


# =========================
# DB
# =========================
client = MongoClient(
    "mongodb+srv://jaehoon1290:wogns0416@cluster0.iv4hqh8.mongodb.net/?retryWrites=true&w=majority"
)
db = client["delivery"]
db.users.create_index("username", unique=True)
db.notices.create_index("created_at")


# =========================
# 모델
# =========================
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


class Order(BaseModel):
    store: str
    address: str | None = None
    items: list | None = None


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


# =========================
# 유틸
# =========================
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


def serialize_order(order: dict) -> dict:
    return {
        "_id": str(order["_id"]),
        "store": order.get("store"),
        "address": order.get("address"),
        "items": order.get("items", []),
        "user": order.get("user"),
        "status": order.get("status"),
        "driver_id": order.get("driver_id"),
        "created_at": order.get("created_at"),
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
        "created_at": user.get("created_at"),
    }


def serialize_notice(notice: dict) -> dict:
    return {
        "_id": str(notice["_id"]),
        "title": notice.get("title"),
        "content": notice.get("content"),
        "target": notice.get("target"),
        "created_at": notice.get("created_at"),
        "created_by": notice.get("created_by"),
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
            "created_at": datetime.utcnow(),
        }
    )


ensure_default_admin()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    db_user = get_user_by_username(payload["username"])
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")

    if not db_user.get("approved", False):
        raise HTTPException(status_code=403, detail="승인 대기 중인 계정입니다.")

    return {
        "username": db_user["username"],
        "role": db_user["role"],
        "storeName": db_user.get("storeName"),
        "phone": db_user.get("phone"),
    }


def require_roles(allowed_roles: list[str]):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="권한 없음")
        return user

    return checker


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
        "created_at": datetime.utcnow(),
    }
    user.update(extra)

    result = db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return user


def get_driver_status(username: str) -> str:
    active_order = db.orders.find_one(
        {
            "driver_id": username,
            "status": {"$in": ["assigned", "delivering"]},
        }
    )
    return "배달중" if active_order else "대기"


# =========================
# 회원가입 / 로그인
# =========================
@app.post("/register")
def register(data: RegisterData):
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

    return {
        "message": "회원가입 완료",
        "approved": user["approved"],
    }


@app.post("/login")
def login(data: LoginData):
    user = get_user_by_username(data.username.strip())

    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("approved", False):
        raise HTTPException(status_code=403, detail="승인 대기 중인 계정입니다.")

    token = jwt.encode(
        {
            "username": user["username"],
            "role": user["role"],
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return {
        "token": token,
        "role": user["role"],
        "username": user["username"],
        "phone": user.get("phone"),
        "storeName": user.get("storeName"),
    }


# =========================
# 관리자 회원 승인
# =========================
@app.get("/pending-users")
def get_pending_users(user=Depends(require_roles(["admin"]))):
    pending_users = db.users.find(
        {
            "approved": False,
            "role": {"$in": ["store", "driver"]},
        }
    ).sort("created_at", -1)

    return [serialize_user(pending_user) for pending_user in pending_users]


@app.post("/approve-user/{user_id}")
def approve_user(user_id: str, user=Depends(require_roles(["admin"]))):
    target_user = get_user_or_404(user_id)
    update_data = {"approved": True}

    if target_user.get("role") == "store" and not target_user.get("storeStatus"):
        update_data["storeStatus"] = "open"

    db.users.update_one(
        {"_id": target_user["_id"]},
        {"$set": update_data},
    )

    return {"message": "approved"}


# =========================
# 관리자 주문 모니터링
# =========================
@app.get("/admin/orders")
def get_admin_orders(status: str | None = None, user=Depends(require_roles(["admin"]))):
    query = {}
    if status:
        if status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="유효하지 않은 주문 상태입니다.")
        query["status"] = status

    return [
        serialize_order(order)
        for order in db.orders.find(query).sort("created_at", -1)
    ]


# =========================
# 가맹점 관리
# =========================
@app.get("/stores")
def get_stores(user=Depends(require_roles(["admin"]))):
    stores = []

    for store in db.users.find({"role": "store"}).sort("created_at", -1):
        store_data = serialize_user(store)
        store_name = store.get("storeName")
        store_data["menus"] = [
            serialize_menu(menu) for menu in db.menus.find({"store": store_name})
        ]
        store_data["orderCount"] = db.orders.count_documents({"store": store_name})
        stores.append(store_data)

    return stores


@app.post("/stores")
def create_store(data: StoreCreate, user=Depends(require_roles(["admin"]))):
    store_status = data.storeStatus if data.storeStatus in STORE_STATUSES else "open"
    store = create_user(
        username=data.username,
        password=data.password,
        phone=data.phone,
        role="store",
        approved=True,
        storeName=data.storeName.strip(),
        storeStatus=store_status,
    )

    return serialize_user(store)


@app.put("/stores/{store_id}")
def update_store(store_id: str, data: StoreUpdate, user=Depends(require_roles(["admin"]))):
    store = get_user_or_404(store_id)
    if store.get("role") != "store":
        raise HTTPException(status_code=400, detail="가게 계정이 아닙니다.")

    update_data = {}
    old_store_name = store.get("storeName")

    if data.storeName is not None:
        new_store_name = data.storeName.strip()
        if not new_store_name:
            raise HTTPException(status_code=400, detail="가게명을 입력하세요.")
        update_data["storeName"] = new_store_name

    if data.phone is not None:
        update_data["phone"] = data.phone.strip()

    if data.storeStatus is not None:
        if data.storeStatus not in STORE_STATUSES:
            raise HTTPException(status_code=400, detail="유효하지 않은 가게 상태입니다.")
        update_data["storeStatus"] = data.storeStatus

    if update_data:
        db.users.update_one({"_id": store["_id"]}, {"$set": update_data})

        if "storeName" in update_data and old_store_name != update_data["storeName"]:
            db.menus.update_many(
                {"store": old_store_name},
                {"$set": {"store": update_data["storeName"]}},
            )
            db.orders.update_many(
                {"store": old_store_name},
                {"$set": {"store": update_data["storeName"]}},
            )

    updated_store = db.users.find_one({"_id": store["_id"]})
    return serialize_user(updated_store)


@app.delete("/stores/{store_id}")
def delete_store(store_id: str, user=Depends(require_roles(["admin"]))):
    store = get_user_or_404(store_id)
    if store.get("role") != "store":
        raise HTTPException(status_code=400, detail="가게 계정이 아닙니다.")

    store_name = store.get("storeName")
    db.users.delete_one({"_id": store["_id"]})
    db.menus.delete_many({"store": store_name})

    return {"ok": True}


# =========================
# 배달기사 관리
# =========================
@app.get("/drivers")
def get_drivers(user=Depends(require_roles(["admin"]))):
    drivers = []

    for driver in db.users.find({"role": "driver"}).sort("created_at", -1):
        driver_data = serialize_user(driver)
        driver_data["driverStatus"] = get_driver_status(driver.get("username"))
        driver_data["orders"] = [
            serialize_order(order)
            for order in db.orders.find({"driver_id": driver.get("username")}).sort(
                "created_at", -1
            )
        ]
        drivers.append(driver_data)

    return drivers


@app.post("/drivers")
def create_driver(data: UserCreate, user=Depends(require_roles(["admin"]))):
    driver = create_user(
        username=data.username,
        password=data.password,
        phone=data.phone,
        role="driver",
        approved=True,
    )
    driver_data = serialize_user(driver)
    driver_data["driverStatus"] = "대기"
    driver_data["orders"] = []
    return driver_data


@app.delete("/drivers/{driver_id}")
def delete_driver(driver_id: str, user=Depends(require_roles(["admin"]))):
    driver = get_user_or_404(driver_id)
    if driver.get("role") != "driver":
        raise HTTPException(status_code=400, detail="기사 계정이 아닙니다.")

    db.users.delete_one({"_id": driver["_id"]})
    db.orders.update_many(
        {
            "driver_id": driver.get("username"),
            "status": {"$in": ["assigned", "delivering"]},
        },
        {"$set": {"driver_id": None, "status": "dispatch_ready"}},
    )
    return {"ok": True}


# =========================
# 고객 관리
# =========================
@app.get("/customers")
def get_customers(user=Depends(require_roles(["admin"]))):
    customers = []

    for customer in db.users.find({"role": "customer"}).sort("created_at", -1):
        customer_data = serialize_user(customer)
        orders = [
            serialize_order(order)
            for order in db.orders.find({"user": customer.get("username")}).sort(
                "created_at", -1
            )
        ]
        customer_data["orders"] = orders
        customer_data["address"] = customer.get("address") or (
            orders[0].get("address") if orders else None
        )
        customer_data["orderCount"] = len(orders)
        customers.append(customer_data)

    return customers


# =========================
# 공지사항
# =========================
@app.post("/notices")
def create_notice(data: NoticeCreate, user=Depends(require_roles(["admin"]))):
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
        "created_at": datetime.utcnow(),
        "created_by": user["username"],
        "read_by": [],
    }
    result = db.notices.insert_one(notice)
    notice["_id"] = result.inserted_id
    return serialize_notice(notice)


@app.get("/notices")
def get_notices(user=Depends(get_current_user)):
    if user["role"] == "admin":
        query = {}
    elif user["role"] == "store":
        query = {"target": {"$in": ["all", "store"]}}
    elif user["role"] == "driver":
        query = {"target": {"$in": ["all", "driver"]}}
    else:
        query = {"target": "all"}

    return [
        serialize_notice(notice)
        for notice in db.notices.find(query).sort("created_at", -1)
    ]


# =========================
# 🍽️ 메뉴
# =========================
@app.post("/menus")
def create_menu(menu: Menu, user=Depends(require_roles(["admin", "store"]))):
    if user["role"] == "store" and user.get("storeName") != menu.store:
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 등록할 수 있습니다.")

    db.menus.insert_one(
        {
            "store": menu.store,
            "name": menu.name,
            "price": menu.price,
        }
    )

    return {"message": "ok"}


@app.get("/menus")
def get_menus():
    closed_store_names = [
        store.get("storeName")
        for store in db.users.find({"role": "store", "storeStatus": "closed"})
    ]

    query = {}
    if closed_store_names:
        query = {"store": {"$nin": closed_store_names}}

    return [serialize_menu(menu) for menu in db.menus.find(query)]


@app.delete("/menus/{menu_id}")
def delete_menu(menu_id: str, user=Depends(require_roles(["admin", "store"]))):
    menu = db.menus.find_one({"_id": object_id_or_400(menu_id, "menu id")})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")

    if user["role"] == "store" and user.get("storeName") != menu.get("store"):
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 삭제할 수 있습니다.")

    db.menus.delete_one({"_id": menu["_id"]})
    return {"ok": True}


@app.put("/menus/{menu_id}")
def update_menu(menu_id: str, data: dict, user=Depends(require_roles(["admin", "store"]))):
    menu = db.menus.find_one({"_id": object_id_or_400(menu_id, "menu id")})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")

    if user["role"] == "store" and user.get("storeName") != menu.get("store"):
        raise HTTPException(status_code=403, detail="본인 가게 메뉴만 수정할 수 있습니다.")

    db.menus.update_one({"_id": menu["_id"]}, {"$set": data})
    return {"ok": True}


# =========================
# 📦 주문
# =========================
@app.post("/orders")
def create_order(order: Order, user=Depends(require_roles(["customer", "admin"]))):
    store = db.users.find_one({"role": "store", "storeName": order.store})

    if store and store.get("storeStatus", "open") == "closed":
        raise HTTPException(status_code=400, detail="현재 영업 중지된 가게입니다.")

    if order.address:
        db.users.update_one(
            {"username": user["username"]},
            {"$set": {"address": order.address}},
        )

    db.orders.insert_one(
        {
            "store": order.store,
            "address": order.address,
            "items": order.items,
            "user": user["username"],
            "status": "pending",
            "driver_id": None,
            "created_at": datetime.utcnow(),
        }
    )

    return {"message": "ok"}


@app.get("/orders")
def get_orders(user=Depends(get_current_user)):
    query = {}

    if user["role"] == "store":
        query = {"store": user.get("storeName")}
    elif user["role"] == "customer":
        query = {"user": user.get("username")}

    return [serialize_order(order) for order in db.orders.find(query).sort("created_at", -1)]


@app.get("/my-orders")
def my_orders(user=Depends(require_roles(["customer", "admin"]))):
    return [
        serialize_order(order)
        for order in db.orders.find({"user": user["username"]}).sort("created_at", -1)
    ]


@app.delete("/orders/{order_id}")
def delete_order(order_id: str, user=Depends(require_roles(["admin"]))):
    order = get_order_or_404(order_id)
    db.orders.delete_one({"_id": order["_id"]})
    return {"ok": True}


@app.put("/orders/{order_id}/status")
def update_status(
    order_id: str,
    data: OrderStatusUpdate,
    user=Depends(require_roles(["admin"])),
):
    if data.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="유효하지 않은 주문 상태입니다.")

    order = get_order_or_404(order_id)
    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": data.status}},
    )
    return {"ok": True}


@app.post("/orders/{order_id}/store_accept")
def store_accept(order_id: str, user=Depends(require_roles(["store"]))):
    order = get_order_or_404(order_id)
    if order.get("store") != user.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")

    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": "accepted"}},
    )
    return {"message": "store accepted"}


@app.post("/orders/{order_id}/reject")
def reject_order(order_id: str, user=Depends(require_roles(["store"]))):
    order = get_order_or_404(order_id)
    if order.get("store") != user.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")

    db.orders.delete_one({"_id": order["_id"]})
    return {"message": "rejected"}


@app.post("/orders/{order_id}/dispatch")
def dispatch(order_id: str, user=Depends(require_roles(["store"]))):
    order = get_order_or_404(order_id)
    if order.get("store") != user.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")

    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": "dispatch_ready"}},
    )
    return {"message": "dispatch requested"}


@app.post("/orders/{order_id}/accept")
def accept_order(order_id: str, user=Depends(require_roles(["driver"]))):
    order = get_order_or_404(order_id)

    if order.get("status") != "dispatch_ready":
        raise HTTPException(status_code=400, detail="배차 요청 상태가 아닙니다.")

    db.orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {
                "status": "assigned",
                "driver_id": user["username"],
            }
        },
    )
    return {"message": "assigned"}


@app.post("/orders/{order_id}/start")
def start_delivery(order_id: str, user=Depends(require_roles(["driver"]))):
    order = get_order_or_404(order_id)

    if order.get("driver_id") != user["username"]:
        raise HTTPException(status_code=403, detail="본인 배달만 시작할 수 있습니다.")

    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": "delivering"}},
    )
    return {"message": "started"}


@app.post("/orders/{order_id}/complete")
def complete_order(order_id: str, user=Depends(require_roles(["driver"]))):
    order = get_order_or_404(order_id)

    if order.get("driver_id") != user["username"]:
        raise HTTPException(status_code=403, detail="본인 배달만 완료할 수 있습니다.")

    db.orders.update_one(
        {"_id": order["_id"]},
        {"$set": {"status": "completed"}},
    )
    return {"message": "completed"}


# =========================
# ✅ 관리자 통계
# =========================
@app.get("/stats")
def get_stats(user=Depends(require_roles(["admin"]))):
    orders = list(db.orders.find())

    total_orders = len(orders)
    total_sales = 0
    today_orders = 0
    store_sales = {}
    status_count = {}
    today = datetime.utcnow().date()

    for order in orders:
        items = order.get("items", [])
        status = order.get("status")
        store = order.get("store")

        order_total = sum(item.get("price", 0) for item in items)
        total_sales += order_total

        created = order.get("created_at")
        if created and created.date() == today:
            today_orders += 1

        if store not in store_sales:
            store_sales[store] = 0
        store_sales[store] += order_total

        if status not in status_count:
            status_count[status] = 0
        status_count[status] += 1

    return {
        "total_orders": total_orders,
        "total_sales": total_sales,
        "today_orders": today_orders,
        "store_sales": store_sales,
        "status_count": status_count,
    }
