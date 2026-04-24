import React from "react";
import { statusTone } from "../../utils/format";

function Badge({ children, tone, status }) {
  const resolvedTone = tone || statusTone(status || String(children || "").toLowerCase());

  return <span className={`ui-badge ui-badge--${resolvedTone}`}>{children}</span>;
}

export default Badge;
