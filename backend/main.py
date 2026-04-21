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

# =========================
# 설정
# =========================
SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"
security = HTTPBearer()

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
client = MongoClient("mongodb+srv://...")
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
# 유저
# =========================
users = [
    {"username": "admin", "password": "1234", "role": "admin"},
    {"username": "driver1", "password": "1234", "role": "driver"},
    {"username": "customer1", "password": "1234", "role": "customer"},
    {"username": "store1", "password": "1234", "role": "store"}
]

# =========================
# 토큰
# =========================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except:
        raise HTTPException(status_code=401)

# =========================
# 로그인
# =========================
@app.post("/login")
def login(data: LoginData):
    user = next((u for u in users if u["username"] == data.username and u["password"] == data.password), None)
    if not user:
        raise HTTPException(status_code=401)

    token = jwt.encode(user, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "role": user["role"]}

# =========================
# 메뉴
# =========================
@app.post("/menus")
def create_menu(menu: Menu, user=Depends(get_current_user)):
    db.menus.insert_one(menu.dict())
    return {"ok": True}

@app.get("/menus")
def get_menus():
    return [{**m, "_id": str(m["_id"])} for m in db.menus.find()]

# =========================
# 주문 생성
# =========================
@app.post("/orders")
def create_order(order: Order):
    db.orders.insert_one({
        **order.dict(),
        "status": "pending",
        "driver_id": None,
        "created_at": datetime.utcnow()
    })
    return {"ok": True}

# =========================
# 주문 조회
# =========================
@app.get("/orders")
def get_orders():
    return [{**o, "_id": str(o["_id"])} for o in db.orders.find()]

# =========================
# 가게 수락
# =========================
@app.post("/orders/{id}/store_accept")
def store_accept(id: str):
    db.orders.update_one({"_id": ObjectId(id)}, {"$set": {"status": "accepted"}})
    return {"ok": True}

# =========================
# 가게 거절
# =========================
@app.post("/orders/{id}/reject")
def reject(id: str):
    db.orders.delete_one({"_id": ObjectId(id)})
    return {"ok": True}

# =========================
# 배차 요청
# =========================
@app.post("/orders/{id}/dispatch")
def dispatch(id: str):
    db.orders.update_one({"_id": ObjectId(id)}, {"$set": {"status": "dispatch_ready"}})
    return {"ok": True}

# =========================
# 🔥 기사 수락 (핵심 수정)
# =========================
@app.post("/orders/{id}/accept")
def accept(id: str, user=Depends(get_current_user)):
    db.orders.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "status": "assigned",   # 🔥 핵심
            "driver_id": user["username"]
        }}
    )
    return {"ok": True}

# =========================
# 배달 시작
# =========================
@app.post("/orders/{id}/start")
def start(id: str):
    db.orders.update_one({"_id": ObjectId(id)}, {"$set": {"status": "delivering"}})
    return {"ok": True}

# =========================
# 완료
# =========================
@app.post("/orders/{id}/complete")
def complete(id: str):
    db.orders.update_one({"_id": ObjectId(id)}, {"$set": {"status": "completed"}})
    return {"ok": True}