import React from "react";

export const NumInput = React.forwardRef(
  ({ value, onChange, placeholder = "0", style: sx = {}, ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      type="text"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^-?\d*\.?\d*$/.test(v)) onChange(v);
      }}
      onBlur={(e) => {
        const v = e.target.value;
        if (v === "-" || v === ".") onChange("");
        else if (v.endsWith(".")) onChange(v.slice(0, -1));
      }}
      style={{
        width: "100%",
        userSelect: "text",
        WebkitUserSelect: "text",
        pointerEvents: "auto",
        ...sx,
      }}
    />
  )
);

export default NumInput;
