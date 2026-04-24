from fastapi import APIRouter, Depends

from backend.core.security import require_roles
from backend.services.platform_service import Menu, create_menu, delete_menu, get_menus, update_menu

router = APIRouter()


@router.post("/menus")
def post_menu(menu: Menu, user=Depends(require_roles(["admin", "store"]))):
    return create_menu(menu, user)


@router.get("/menus")
def menus():
    return get_menus()


@router.delete("/menus/{menu_id}")
def remove_menu(menu_id: str, user=Depends(require_roles(["admin", "store"]))):
    return delete_menu(menu_id, user)


@router.put("/menus/{menu_id}")
def put_menu(menu_id: str, data: dict, user=Depends(require_roles(["admin", "store"]))):
    return update_menu(menu_id, data, user)
