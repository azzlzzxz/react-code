import * as React from "./react";
import { createRoot } from "react-dom/src/client/ReactDOMRoot";

function FunctionComponent() {
  const btnRef = React.useRef();

  React.useEffect(() => {
    console.log("btnRef1", btnRef.current);
  }, [])

  return (
    <div>
      <button ref={btnRef}>btn1</button>
      <button ref={(instance) => console.log("btnRef2", instance)}>
        btn2
      </button>
    </div>
  );
}

let element = <FunctionComponent />;

const root = createRoot(document.getElementById("root"));

root.render(element);