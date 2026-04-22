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

print("🔥 NEW VERSION DEPLOYED 🔥")


@app.get("/")
def home():
    return {"message": "server running"}


# =========================
# 🔐 설정
# =========================
SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"
security = HTTPBearer()
ALLOWED_REGISTER_ROLES = {"customer", "store", "driver"}


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


class Order(BaseModel):
    store: str
    address: str | None = None
    items: list | None = None


class Menu(BaseModel):
    store: str
    name: str
    price: int


# =========================
# 유틸
# =========================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def serialize_user(user: dict) -> dict:
    return {
        "_id": str(user["_id"]),
        "username": user.get("username"),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "approved": user.get("approved", False),
        "storeName": user.get("storeName"),
        "created_at": user.get("created_at"),
    }


def ensure_default_admin():
    admin_user = db.users.find_one({"username": "admin"})

    if admin_user:
        return

    db.users.insert_one(
        {
            "username": "admin",
            "password": hash_password("1234"),
            "phone": "010-0000-0000",
            "role": "admin",
            "approved": True,
            "storeName": None,
            "created_at": datetime.utcnow(),
        }
    )


ensure_default_admin()


def get_user_by_username(username: str):
    return db.users.find_one({"username": username})


def get_order_or_404(order_id: str):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order id")

    order = db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return order


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


def require_admin(user: dict):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


# =========================
# 회원가입 / 로그인
# =========================
@app.post("/register")
def register(data: RegisterData):
    username = data.username.strip()
    phone = data.phone.strip()
    role = data.role.strip()
    store_name = data.storeName.strip() if data.storeName else None

    if not username or not data.password.strip() or not phone:
        raise HTTPException(status_code=400, detail="모든 필수 항목을 입력하세요.")

    if role not in ALLOWED_REGISTER_ROLES:
        raise HTTPException(status_code=400, detail="유효하지 않은 역할입니다.")

    if role == "store" and not store_name:
        raise HTTPException(status_code=400, detail="가게명 입력이 필요합니다.")

    if get_user_by_username(username):
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")

    approved = role == "customer"

    db.users.insert_one(
        {
            "username": username,
            "password": hash_password(data.password),
            "phone": phone,
            "role": role,
            "approved": approved,
            "storeName": store_name if role == "store" else None,
            "created_at": datetime.utcnow(),
        }
    )

    return {
        "message": "회원가입 완료",
        "approved": approved,
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
def get_pending_users(user=Depends(get_current_user)):
    require_admin(user)

    pending_users = db.users.find(
        {
            "approved": False,
            "role": {"$in": ["store", "driver"]},
        }
    ).sort("created_at", -1)

    return [serialize_user(pending_user) for pending_user in pending_users]


@app.post("/approve-user/{user_id}")
def approve_user(user_id: str, user=Depends(get_current_user)):
    require_admin(user)

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"approved": True}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "approved"}


# =========================
# 🍽️ 메뉴
# =========================
@app.post("/menus")
def create_menu(menu: Menu, user=Depends(get_current_user)):
    if user["role"] not in ["admin", "store"]:
        raise HTTPException(status_code=403, detail="권한 없음")

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
    return [
        {
            "_id": str(menu["_id"]),
            "store": menu.get("store"),
            "name": menu.get("name"),
            "price": menu.get("price"),
        }
        for menu in db.menus.find()
    ]


# =========================
# 🍽️ 메뉴 삭제
# =========================
@app.delete("/menus/{menu_id}")
def delete_menu(menu_id: str):
    db.menus.delete_one({"_id": ObjectId(menu_id)})
    return {"ok": True}


# =========================
# 🍽️ 메뉴 수정
# =========================
@app.put("/menus/{menu_id}")
def update_menu(menu_id: str, data: dict):
    db.menus.update_one({"_id": ObjectId(menu_id)}, {"$set": data})
    return {"ok": True}


# =========================
# 📦 주문 생성 (고객)
# =========================
@app.post("/orders")
def create_order(order: Order, user=Depends(get_current_user)):
    if user["role"] not in ["customer", "admin"]:
        raise HTTPException(status_code=403, detail="권한 없음")

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


# =========================
# 📦 주문 조회
# =========================
@app.get("/orders")
def get_orders(user=Depends(get_current_user)):
    return [
        {
            "_id": str(order["_id"]),
            "store": order.get("store"),
            "address": order.get("address"),
            "items": order.get("items"),
            "status": order.get("status"),
            "driver_id": order.get("driver_id"),
            "created_at": order.get("created_at"),
        }
        for order in db.orders.find()
    ]


# =========================
# 📦 내 주문 조회
# =========================
@app.get("/my-orders")
def my_orders(user=Depends(get_current_user)):
    return [
        {
            "_id": str(order["_id"]),
            "store": order.get("store"),
            "status": order.get("status"),
            "created_at": order.get("created_at"),
        }
        for order in db.orders.find({"user": user["username"]})
    ]


# =========================
# 📦 주문 삭제
# =========================
@app.delete("/orders/{order_id}")
def delete_order(order_id: str):
    db.orders.delete_one({"_id": ObjectId(order_id)})
    return {"ok": True}


# =========================
# 📦 주문 상태 변경
# =========================
@app.put("/orders/{order_id}/status")
def update_status(order_id: str, data: dict):
    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": data["status"]}},
    )
    return {"ok": True}


# =========================
# 🏪 가게 수락
# =========================
@app.post("/orders/{order_id}/store_accept")
def store_accept(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "store":
        raise HTTPException(status_code=403, detail="권한 없음")

    order = get_order_or_404(order_id)
    if order.get("store") != user.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "accepted"}},
    )

    return {"message": "store accepted"}


# =========================
# 🏪 가게 거절
# =========================
@app.post("/orders/{order_id}/reject")
def reject_order(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "store":
        raise HTTPException(status_code=403, detail="권한 없음")

    order = get_order_or_404(order_id)
    if order.get("store") != user.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")

    db.orders.delete_one({"_id": ObjectId(order_id)})
    return {"message": "rejected"}


# =========================
# 🚚 배차 요청
# =========================
@app.post("/orders/{order_id}/dispatch")
def dispatch(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "store":
        raise HTTPException(status_code=403, detail="권한 없음")

    order = get_order_or_404(order_id)
    if order.get("store") != user.get("storeName"):
        raise HTTPException(status_code=403, detail="본인 가게 주문만 처리할 수 있습니다.")

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "dispatch_ready"}},
    )

    return {"message": "dispatch requested"}


# =========================
# 🚴 기사 수락
# =========================
@app.post("/orders/{order_id}/accept")
def accept_order(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "driver":
        raise HTTPException(status_code=403, detail="권한 없음")

    get_order_or_404(order_id)

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": "assigned",
                "driver_id": user["username"],
            }
        },
    )

    return {"message": "assigned"}


# =========================
# 🚚 배달 시작
# =========================
@app.post("/orders/{order_id}/start")
def start_delivery(order_id: str, user=Depends(get_current_user)):
    get_order_or_404(order_id)

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "delivering"}},
    )
    return {"message": "started"}


# =========================
# ✅ 완료
# =========================
@app.post("/orders/{order_id}/complete")
def complete_order(order_id: str, user=Depends(get_current_user)):
    get_order_or_404(order_id)

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "completed"}},
    )
    return {"message": "completed"}


# =========================
# ✅ 관리자 통계
# =========================
@app.get("/stats")
def get_stats():
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
