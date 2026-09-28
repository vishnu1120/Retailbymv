import React from "react";

export const Select = React.forwardRef(({ children, ...props }, ref) => (
  <select
    ref={ref}
    {...props}
    style={{
      width: "100%",
      cursor: "pointer",
      pointerEvents: "auto",
      ...props.style,
    }}
  >
    {children}
  </select>
));

export default Select;
