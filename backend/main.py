from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from bson import ObjectId
from jose import jwt
from passlib.context import CryptContext

app = FastAPI()

# =========================
# 🔐 설정
# =========================
SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DB
# =========================
client = MongoClient("mongodb://localhost:27017")
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
# 로그인
# =========================
@app.post("/login")
def login(data: LoginData):
    user = next((u for u in users if u["username"] == data.username and u["password"] == data.password), None)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {"username": user["username"], "role": user["role"]},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {"token": token, "role": user["role"]}

# =========================
# 주문 생성
# =========================
@app.post("/orders")
def create_order(order: Order):
    data = {
        "store": order.store,
        "address": order.address,
        "status": "waiting",
        "driver_id": None
    }
    db.orders.insert_one(data)
    return {"message": "ok"}

# =========================
# 주문 조회
# =========================
@app.get("/orders")
def get_orders():
    orders = []

    for o in db.orders.find():
        orders.append({
            "_id": str(o["_id"]),
            "store": o.get("store"),
            "address": o.get("address"),
            "status": o.get("status"),
            "driver_id": o.get("driver_id")
        })

    return orders

# =========================
# 수락 (🔥 driver 저장)
# =========================
@app.post("/orders/{order_id}/accept")
def accept_order(order_id: str, username: str):
    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": "accepted",
            "driver_id": username
        }}
    )
    return {"message": "accepted"}

# =========================
# 완료
# =========================
@app.post("/orders/{order_id}/complete")
def complete_order(order_id: str):
    db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "completed"}}
    )
    return {"message": "completed"}