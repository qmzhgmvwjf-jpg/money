from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from backend.core.config import ALGORITHM, SECRET_KEY
from backend.core.database import db
from backend.services.platform_service import get_user_by_username, now_utc

security = HTTPBearer()


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

    db.users.update_one({"_id": db_user["_id"]}, {"$set": {"last_active_at": now_utc()}})
    return {
        "id": str(db_user["_id"]),
        "username": db_user["username"],
        "role": db_user["role"],
        "storeName": db_user.get("storeName"),
        "phone": db_user.get("phone"),
        "address": db_user.get("address"),
        "onlineStatus": db_user.get("onlineStatus"),
    }


def require_roles(allowed_roles: list[str]):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="권한 없음")
        return user

    return checker
