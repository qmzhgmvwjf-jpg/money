import React from "react";

function Button({
  children,
  variant = "primary",
  loading = false,
  block = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={`ui-button ui-button--${variant} ${block ? "ui-button--block" : ""} ${className}`.trim()}
      disabled={loading || props.disabled}
      {...props}
    >
      <span className={`ui-button__content ${loading ? "is-loading" : ""}`}>
        {loading && <span className="ui-spinner" />}
        {children}
      </span>
    </button>
  );
}

export default Button;
