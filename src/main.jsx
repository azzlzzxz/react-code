import { createRoot } from "react-dom/src/client/ReactDOMRoot";

function FunctionComponent() {
    return (
      <h1
        onClick={(event) => console.log('ParentBubble','event.currentTarget:',event.currentTarget)}
        onClickCapture={(event) => console.log('ParentCapture','event.currentTarget:',event.currentTarget)}
      >
        <span
          onClick={(event) => console.log('ChildBubble','event.currentTarget:',event.currentTarget)}
          onClickCapture={(event) => console.log('ChildCapture','event.currentTarget:',event.currentTarget)}
        >
          hello
        </span>
      </h1>
    )
  }

let element = <FunctionComponent />

const root = createRoot(document.getElementById('root'));

root.render(element);