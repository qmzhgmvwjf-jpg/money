import React from "react";
import Button from "../ui/Button";

function Header({
  title,
  subtitle,
  actionLabel,
  onAction,
  leading,
  compact = false,
}) {
  return (
    <header className={`app-header ${compact ? "app-header--compact" : ""}`}>
      <div className="app-header__content">
        {leading}
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actionLabel && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </header>
  );
}

export default Header;
