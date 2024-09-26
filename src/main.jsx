import * as React from "./react";
import { createRoot } from "react-dom/src/client/ReactDOMRoot";

function FunctionComponent1() {
  const [number, setNumber] = React.useState(0);

  React.useEffect(() => {
    // debugger
    setNumber(number => number + 1)
    setNumber(number => number + 2)
  },[])

  return (
    <button
      onClick={() => {
        setNumber(number + 1);
        setNumber(number => number + 2)
      }}
    >
      {number}
    </button>
  );
}

/*********************** 高优先级打断低优先级 ************************/

// 为了方便看的打断效果，可以在ReactFiberWorkLoop文件中，的workLoopConcurrent函数，解开sleep的注释

function FunctionComponent() {
  const [numbers, setNumbers] = React.useState(new Array(20).fill("A"));

  React.useEffect(() => {
    setTimeout(() => {}, 10);

    setNumbers((numbers) => numbers.map((number) => number + "B"));
    setNumbers((numbers) => numbers.map((number) => number + "D"));
  }, []);

  return (
    <button
      onClick={() => {
        setNumbers((numbers) => numbers.map(number => number + 'C'));
      }}
    >
      {numbers.map((number, index) => (
        <span key={index}>{number}</span>
      ))}
    </button>
  );
}



let element = <FunctionComponent />;

const root = createRoot(document.getElementById("root"));

root.render(element);
