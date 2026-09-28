import React from "react";

export const Input = React.forwardRef((props, ref) => (
  <input
    ref={ref}
    {...props}
    style={{
      width: "100%",
      userSelect: "text",
      WebkitUserSelect: "text",
      pointerEvents: "auto",
      ...props.style,
    }}
  />
));

export default Input;
