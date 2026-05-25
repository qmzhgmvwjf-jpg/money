import React from "react";

function LoadingState({ label = "정보를 불러오는 중입니다" }) {
  return (
    <div className="loading-state">
      <span className="ui-spinner" />
      <span>{label}</span>
    </div>
  );
}

export default LoadingState;
