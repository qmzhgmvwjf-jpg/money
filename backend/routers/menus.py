from fastapi import APIRouter, Depends
from fastapi import Query

from backend.core.security import require_roles
from backend.services.platform_service import Menu, create_menu, delete_menu, get_menu_list, update_menu

router = APIRouter()


@router.post("/menus")
def post_menu(menu: Menu, user=Depends(require_roles(["admin", "store"]))):
    return create_menu(menu, user)


@router.get("/menus")
def menus(store_id: str | None = Query(default=None)):
    return get_menu_list(store_id)


@router.delete("/menus/{menu_id}")
def remove_menu(menu_id: str, user=Depends(require_roles(["admin", "store"]))):
    return delete_menu(menu_id, user)


@router.put("/menus/{menu_id}")
def put_menu(menu_id: str, data: dict, user=Depends(require_roles(["admin", "store"]))):
    return update_menu(menu_id, data, user)
