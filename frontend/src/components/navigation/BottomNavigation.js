import React from "react";

function BottomNavigation({ items, activeKey, onChange }) {
  return (
    <nav className="bottom-navigation">
      {items.map((item) => (
        <button
          key={item.key}
          className={`bottom-navigation__item ${activeKey === item.key ? "is-active" : ""}`}
          onClick={() => onChange(item.key)}
          type="button"
        >
          <span className="bottom-navigation__icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNavigation;
