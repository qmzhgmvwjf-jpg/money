import React from "react";

function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      {title && <strong>{title}</strong>}
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}

export default EmptyState;
