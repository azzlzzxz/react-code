import { createRoot } from "react-dom/src/client/ReactDOMRoot";

function FunctionComponent () {
  return (
      <h1 id="container">
          hello<span style={{ color: 'red' }}>world</span>
      </h1>
  )
}

let element = <FunctionComponent />

const root = createRoot(document.getElementById('root'));

root.render(element);