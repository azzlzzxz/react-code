import { createRoot } from "react-dom/src/client/ReactDOMRoot";

function FunctionComponent() {
    return (
        <h1 
            onClick={() => console.log('父冒泡')} 
            onClickCapture={() => console.log('父捕获')}
        >
            <span 
                onClick={() => console.log('子冒泡')} 
                onClickCapture={() => console.log('子捕获')}
            >
                hello
            </span>
        </h1>
    )
}

let element = <FunctionComponent />

const root = createRoot(document.getElementById('root'));

root.render(element);