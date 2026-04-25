from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend import admin, auth, driver, menus, notices, orders, store
from backend.services.platform_service import ensure_default_admin

app = FastAPI()


@app.get("/")
def home():
    return {"message": "server running"}


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


ensure_default_admin()

app.include_router(auth.router)
app.include_router(notices.router)
app.include_router(menus.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(driver.router)
app.include_router(store.router)
