const CART_KEY = "delivery_cart";

export function getCartItems() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCartItems(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function clearCartItems() {
  localStorage.removeItem(CART_KEY);
}

export function addCartItem(menu) {
  const current = getCartItems();
  if (current.length > 0 && current[0].store_id !== menu.store_id) {
    return { replaced: false, conflict: true, items: current };
  }
  const next = [...current, menu];
  setCartItems(next);
  return { replaced: false, conflict: false, items: next };
}

export function replaceCartWithItem(menu) {
  const next = [menu];
  setCartItems(next);
  return next;
}
