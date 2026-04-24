from pymongo import MongoClient

client = MongoClient(
    "mongodb+srv://jaehoon1290:wogns0416@cluster0.iv4hqh8.mongodb.net/?retryWrites=true&w=majority"
)
db = client["delivery"]
db.users.create_index("username", unique=True)
db.orders.create_index("order_id", unique=True, sparse=True)
db.notices.create_index("created_at")
db.activity_logs.create_index("created_at")
