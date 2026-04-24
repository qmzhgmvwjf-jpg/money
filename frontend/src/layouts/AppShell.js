import React from "react";

function AppShell({ children, mobile = false }) {
  return (
    <div className="page-shell">
      <div className={mobile ? "mobile-shell page-stack floating-space" : "page-stack"}>
        {children}
      </div>
    </div>
  );
}

export default AppShell;
