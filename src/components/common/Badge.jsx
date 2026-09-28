import React from "react";
import { T } from "../../constants/theme";

export const Badge = ({ color, children }) => {
  const map = {
    green:  { bg: T.greenDim,  color: T.green,  border: T.green },
    red:    { bg: T.redDim,    color: T.red,    border: T.red },
    amber:  { bg: T.amberDim,  color: T.amber,  border: T.amber },
    blue:   { bg: T.accentDim, color: T.accent, border: T.accent },
    purple: { bg: T.purpleDim, color: T.purple, border: T.purple },
  };
  const s = map[color] || map.blue;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".03em",
        border: `1px solid ${s.border}22`,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
