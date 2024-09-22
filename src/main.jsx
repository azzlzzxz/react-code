import * as React from "./react";
import { createRoot } from "react-dom/src/client/ReactDOMRoot";

/** 第一次循环跳出例子 */
function FunctionComponent1() {
  console.log("FunctionComponent");
  const [number, setNumber] = React.useState(0);
  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C" id="C">
        C
      </li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A2</li>
      <p key="B" id="B2">
        B2
      </p>
      <li key="C" id="C2">
        C2
      </li>
    </ul>
  );
}

function FunctionComponent() {
  console.log("FunctionComponent");
  const [number, setNumber] = React.useState(0);

  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="b">
        B
      </li>
      <li key="C">C</li>
      <li key="D">D</li>
      <li key="E">E</li>
      <li key="F">F</li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A2</li>
      <li key="C">C2</li>
      <li key="E">E2</li>
      <li key="B" id="b2">
        B2
      </li>
      <li key="G">G</li>
      <li key="D">D2</li>
    </ul>
  );
}

let element = <FunctionComponent />;

const root = createRoot(document.getElementById("root"));

root.render(element);
