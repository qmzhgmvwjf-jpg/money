import React from "react";

function Input({ label, className = "", as = "input", ...props }) {
  const Comp = as;

  return (
    <label className={`ui-input ${className}`.trim()}>
      {label && <span className="ui-input__label">{label}</span>}
      <Comp className="ui-input__field" {...props} />
    </label>
  );
}

export default Input;
