from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from pydantic import BaseModel
from bson import ObjectId
from jose import jwt

app = FastAPI()

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
# 🔥 CORS (이게 핵심, 이것만 사용)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://money-sepia-beta.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ❗ OPTIONS 핸들러 삭제 (중요)

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
    address: str

# =========================
# 유저 (임시)
# =========================
users = [
    {"username": "admin", "password": "1234", "role": "admin"},
    {"username": "driver1", "password": "1234", "role": "driver"}
]

# =========================
# 🔐 토큰 검증
# =========================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
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
# 주문 생성 (관리자)
# =========================
@app.post("/orders")
def create_order(order: Order, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    db.orders.insert_one({
        "store": order.store,
        "address": order.address,
        "status": "waiting",
        "driver_id": None
    })

    return {"message": "ok"}

# =========================
# 주문 조회
# =========================
@app.get("/orders")
def get_orders(user=Depends(get_current_user)):
    return [
        {
            "_id": str(o["_id"]),
            "store": o.get("store"),
            "address": o.get("address"),
            "status": o.get("status"),
            "driver_id": o.get("driver_id")
        }
        for o in db.orders.find()
    ]

# =========================
# 수락 (기사)
# =========================
@app.post("/orders/{order_id}/accept")
def accept_order(order_id: str, user=Depends(get_current_user)):
    if user["role"] != "driver":
        raise HTTPException(status_code=403, detail="Not allowed")

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": "accepted",
            "driver_id": user["username"]
        }}
    )

    return {"message": "accepted"}

# =========================
# 완료 (기사)
# =========================
@app.post("/orders/{order_id}/complete")
def complete_order(order_id: str, user=Depends(get_current_user)):
    order = db.orders.find_one({"_id": ObjectId(order_id)})

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("driver_id") != user["username"]:
        raise HTTPException(status_code=403, detail="Not your order")

    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "completed"}}
    )

    return {"message": "completed"}