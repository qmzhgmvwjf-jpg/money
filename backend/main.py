from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from pydantic import BaseModel
from bson import ObjectId
from jose import jwt
from fastapi.responses import JSONResponse
from datetime import datetime

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

# =========================
# 모델
# =========================
class LoginData(BaseModel):
    username: str
    password: str

class Order(BaseModel):
    store: str
    address: str | None = None
    items: list | None = None

class Menu(BaseModel):
    store: str
    name: str
    price: int

# =========================
# 유저 (임시)
# =========================
users = [
    {"username": "admin", "password": "1234", "role": "admin"},
    {"username": "driver1", "password": "1234", "role": "driver"},
    {"username": "customer1", "password": "1234", "role": "customer"},
    {"username": "store1", "password": "1234", "role": "store"}
]

# =========================
# 🔐 토큰 검증
# =========================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# =========================
# 로그인
# =========================
@app.post("/login")
def login(data: LoginData):
    user = next(
        (u for u in users if u["username"] == data.username and u["password"] == data.password),
        None
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {"username": user["username"], "role": user["role"]},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {"token": token, "role": user["role"]}

# =========================
# 🍽️ 메뉴
# =========================
@app.post("/menus")
def create_menu(menu: Menu, user=Depends(get_current_user)):
    if user["role"] not in ["admin", "store"]:
        raise HTTPException(status_code=403)

    db.menus.insert_one({
        "store": menu.store,
        "name": menu.name,
        "price": menu.price
    })

    return {"message": "ok"}

@app.get("/menus")
def get_menus():
    return [
        {
            "_id": str(m["_id"]),
            "store": m.get("store"),
            "name": m.get("name"),
            "price": m.get("price")
        }
        for m in db.menus.find()
    ]

# =========================
# 📦 주문 생성 (고객)
# =========================
@app.post("/orders")
def create_order(order: Order, user=Depends(get_current_user)):
    if user["role"] not in ["customer", "admin"]:
        raise HTTPException(status_code=403)

    db.orders.insert_one({
        "store": order.store,
        "address": order.address,
        "items": order.items,
        "status": "pending",   # 🔥 가게 대기
        "driver_id": None,
        "created_at": datetime.utcnow()
    })

    return {"message": "ok"}

# =========================
# 📦 주문 조회
# =========================
@app.get("/orders")
def get_orders(user=Depends(get_current_user)):
    return [
        {
            "_id": str(o["_id"]),
            "store": o.get("store"),
            "address": o.get("address"),
            "items": o.get("items"),
            "status": o.get("status"),
            "driver_id": o.get("driver_id"),
            "created_at": o.get("created_at")
        }
        for o in db.orders.find()
    ]

# =========================
# 🏪 가게 수락
# =========================
@app.post("/orders/{order_id}/store_accept")
def store_accept(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "store":
        raise HTTPException(status_code=403)

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "accepted"}}
    )

    return {"message": "store accepted"}

# =========================
# 🚚 배차 요청
# =========================
@app.post("/orders/{order_id}/dispatch")
def dispatch(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "store":
        raise HTTPException(status_code=403)

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "dispatch_ready"}}
    )

    return {"message": "dispatch requested"}

# =========================
# 🚴 기사 수락
# =========================
@app.post("/orders/{order_id}/accept")
def accept_order(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "driver":
        raise HTTPException(status_code=403)

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": "accepted",
            "driver_id": user["username"]
        }}
    )

    return {"message": "accepted"}

# =========================
# 🚚 배달 시작
# =========================
@app.post("/orders/{order_id}/start")
def start_delivery(order_id: str, user=Depends(get_current_user)):
    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "delivering"}}
    )
    return {"message": "started"}

# =========================
# ✅ 완료
# =========================
@app.post("/orders/{order_id}/complete")
def complete_order(order_id: str, user=Depends(get_current_user)):
    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "completed"}}
    )
    return {"message": "completed"}