import { useId } from "react";

function noop() {}

export const Button = ({ action, children }) => {
  const id = useId();

  return (
    <button id={id} onClick={action ?? noop}>
      {children}
    </button>
  );
};
