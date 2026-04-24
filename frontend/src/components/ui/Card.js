import React from "react";

function Card({ children, className = "", interactive = false, ...props }) {
  return (
    <div
      className={`ui-card surface-glow ${interactive ? "ui-card--interactive" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
