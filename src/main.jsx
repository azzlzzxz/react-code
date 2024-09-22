import * as React from "./react";
import { createRoot } from "react-dom/src/client/ReactDOMRoot";

/** 单节点 key相同 type 相同 */
function FunctionComponent1() {
  const [number, setNumber] = React.useState(0);

  return number === 0 ? (
    <div key="title1" id="title1" onClick={() => setNumber(number + 1)}>
      title
    </div>
  ) : (
    <div key="title1" id="title2" onClick={() => setNumber(number + 1)}>
      title2
    </div>
  );
}

/** 单节点 key不同 type 相同 */
function FunctionComponent2() {
  const [number, setNumber] = React.useState(0);
  return number === 0 ? (
    <div key={"title1"} onClick={() => setNumber(number + 1)} id="title">
      title
    </div>
  ) : (
    <div onClick={() => setNumber(number + 1)} key={"title2"} id="title2">
      title2
    </div>
  );
}

/** 单节点 key相同 type 不同 */
function FunctionComponent3() {
  const [number, setNumber] = React.useState(0);
  return number === 0 ? (
    <div onClick={() => setNumber(number + 1)} key="title1" id="title1">
      title1
    </div>
  ) : (
    <p onClick={() => setNumber(number + 1)} key="title1" id="title1">
      title1
    </p>
  );
}

function FunctionComponent() {
  const [number, setNumber] = React.useState(0);
  return number === 0 ? (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="A">A</li>
      <li key="B" id="B">
        B
      </li>
      <li key="C">C</li>
    </ul>
  ) : (
    <ul key="container" onClick={() => setNumber(number + 1)}>
      <li key="B" id="B2">
        B2
      </li>
    </ul>
  );
}

let element = <FunctionComponent />;

const root = createRoot(document.getElementById("root"));

root.render(element);
