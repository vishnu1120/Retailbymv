import React from "react";
import { T } from "../../constants/theme";

export const StatCard = ({ label, value, sub, color = T.accent, icon }) => (
  <div
    style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: "18px 20px",
      boxShadow: `0 1px 4px ${T.shadow}`,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        right: -10,
        top: -10,
        fontSize: 52,
        opacity: 0.07,
        userSelect: "none",
        lineHeight: 1,
      }}
    >
      {icon}
    </div>
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: T.muted,
      }}
    >
      {label}
    </span>
    <div
      style={{
        fontSize: 26,
        fontWeight: 800,
        color,
        fontFamily: "'JetBrains Mono',monospace",
        letterSpacing: "-.02em",
      }}
    >
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 500 }}>{sub}</div>
    )}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg,${color}44,${color}00)`,
        borderRadius: "0 0 14px 14px",
      }}
    />
  </div>
);

export default StatCard;
