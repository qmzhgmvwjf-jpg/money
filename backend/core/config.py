SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"

REGISTER_ROLES = {"customer", "store", "driver"}
ALL_ROLES = {"admin", "customer", "store", "driver"}
ORDER_STATUSES = {
    "pending",
    "accepted",
    "dispatch_ready",
    "assigned",
    "delivering",
    "completed",
    "cancelled",
}
ADMIN_ORDER_FILTERS = {"all", "in_progress", "completed", "cancelled"}
STORE_ORDER_FILTERS = {"all", "in_progress", "completed", "cancelled"}
NOTICE_TARGETS = {"all", "store", "driver"}
STORE_STATUSES = {"open", "closed"}
DRIVER_ONLINE_STATUSES = {"online", "offline"}
STATUS_TO_KOREAN = {
    "pending": "주문접수",
    "accepted": "가게수락",
    "dispatch_ready": "배차요청",
    "assigned": "기사배정",
    "delivering": "배달중",
    "completed": "배달완료",
    "cancelled": "주문취소",
}
DRIVER_FEE_RATE = 0.12
