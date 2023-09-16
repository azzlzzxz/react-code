import { createRoot } from "react-dom/src/client/ReactDOMRoot";

let element = <h1>Hello, <span style={{color: 'red'}}>world</span></h1>;

console.log(element);
debugger;
const root = createRoot(document.getElementById('root'));
console.log(root)
// root.render(element);