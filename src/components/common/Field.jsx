import React from "react";
import { T } from "../../constants/theme";

export const Field = ({ label, children, style: sx = {} }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, ...sx }}>
    <label
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        color: T.muted,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

export default Field;
