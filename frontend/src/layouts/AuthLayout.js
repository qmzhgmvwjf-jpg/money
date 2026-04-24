import React from "react";

function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__aurora auth-layout__aurora--left" />
      <div className="auth-layout__aurora auth-layout__aurora--right" />
      <div className="auth-layout__panel fade-in">{children}</div>
    </div>
  );
}

export default AuthLayout;
