import * as React from "./react";
import { createRoot } from "react-dom/src/client/ReactDOMRoot";

let element = <h1>hello</h1>;

const root = createRoot(document.getElementById("root"));

root.render(element);
