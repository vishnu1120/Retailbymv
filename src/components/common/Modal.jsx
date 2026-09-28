import React from "react";
import { T } from "../../constants/theme";

export const Modal = ({ title, onClose, children, width = 560 }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.6)",
      backdropFilter: "blur(4px)",
      zIndex: 200,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        width,
        maxWidth: "96vw",
        maxHeight: "92vh",
        overflow: "auto",
        boxShadow: `0 24px 60px ${T.shadow}`,
        animation: "fadeIn .18s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 24px",
          borderBottom: `1px solid ${T.border}`,
          position: "sticky",
          top: 0,
          background: T.card,
          zIndex: 1,
          borderRadius: "18px 18px 0 0",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>
          {title}
        </span>
        <button
          onClick={onClose}
          style={{
            background: T.subtle,
            border: "none",
            color: T.muted,
            width: 28,
            height: 28,
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.redDim;
            e.currentTarget.style.color = T.red;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = T.subtle;
            e.currentTarget.style.color = T.muted;
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

export default Modal;
