import React from "react";
import Button from "./Button";

function Modal({ open, title, onClose, children, position = "bottom" }) {
  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div
        className={`ui-modal ui-modal--${position} slide-in`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-modal__header">
          <h3>{title}</h3>
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
        <div className="ui-modal__body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
