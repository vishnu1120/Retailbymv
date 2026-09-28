import React from "react";
import { T } from "../../constants/theme";

export const Btn = React.memo(
  React.forwardRef(
    (
      {
        children,
        onClick,
        variant = "primary",
        size = "md",
        style: sx = {},
        disabled = false,
        type = "button",
        ...rest
      },
      ref
    ) => {
      const styles = {
        primary: {
          background: T.accent,
          color: "#fff",
          border: "none",
          boxShadow: `0 1px 3px ${T.shadow}`,
        },
        secondary: {
          background: T.surface,
          color: T.text,
          border: `1.5px solid ${T.border}`,
          boxShadow: "none",
        },
        danger: {
          background: T.red,
          color: "#fff",
          border: "none",
          boxShadow: `0 1px 3px ${T.shadow}`,
        },
        ghost: {
          background: "transparent",
          color: T.muted,
          border: `1.5px solid ${T.border}`,
          boxShadow: "none",
        },
        success: {
          background: T.green,
          color: "#fff",
          border: "none",
          boxShadow: `0 1px 3px ${T.shadow}`,
        },
        warning: {
          background: T.amber,
          color: "#fff",
          border: "none",
          boxShadow: `0 1px 3px ${T.shadow}`,
        },
      };

      const sizes = {
        sm: {
          padding: "5px 12px",
          fontSize: 11.5,
          borderRadius: 7,
          fontWeight: 500,
        },
        md: {
          padding: "8px 16px",
          fontSize: 13,
          borderRadius: 8,
          fontWeight: 600,
        },
        lg: {
          padding: "11px 22px",
          fontSize: 13.5,
          borderRadius: 9,
          fontWeight: 600,
        },
      };

      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled}
          className="erp-btn"
          {...rest}
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.45 : 1,
            letterSpacing: ".01em",
            userSelect: "none",
            touchAction: "manipulation",
            pointerEvents: disabled ? "none" : "auto",
            ...styles[variant],
            ...sizes[size],
            ...sx,
          }}
        >
          {children}
        </button>
      );
    }
  )
);

export default Btn;
