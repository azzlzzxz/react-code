import { createRoot } from "react-dom/src/client/ReactDOMRoot";
// debugger
let element = <h1>Hello, <span style={{color: 'red'}}>world</span></h1>;

console.log(element);

const root = createRoot(document.getElementById('root'));
console.log(root)
root.render(element);