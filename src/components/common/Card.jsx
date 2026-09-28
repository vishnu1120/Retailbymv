import React from "react";
import { T } from "../../constants/theme";

export const Card = ({ children, style: sx = {} }) => (
  <div
    style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: 20,
      boxShadow: `0 1px 4px ${T.shadow}`,
      ...sx,
    }}
  >
    {children}
  </div>
);

export default Card;
