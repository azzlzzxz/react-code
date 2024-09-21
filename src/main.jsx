import * as React from "./react";
import { createRoot } from "react-dom/src/client/ReactDOMRoot";
function FunctionComponent() {
  const [number, setNumber] = React.useState(0);

  return <button onClick={() => setNumber(number + 1)}>{number}</button>;
}

let element = <FunctionComponent />;

const root = createRoot(document.getElementById("root"));

root.render(element);
