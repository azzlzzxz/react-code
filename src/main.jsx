import * as React from './react';
import { createRoot } from "react-dom/src/client/ReactDOMRoot";

function counter (state, action) {
  if (action.type === 'add') return state + action.payload

  return state
}
function FunctionComponent() {
  const [number, setNumber] = React.useReducer(counter, 0)

  let attrs = { id: 'btn1' }

  if (number === 6) {
    delete attrs.id
    attrs.style = {color: 'red'}
  }
  
  return <button {...attrs} onClick={() => {
    setNumber({ type: 'add', payload: 1 })
    setNumber({ type: 'add', payload: 2 })
    setNumber({ type: 'add', payload: 3 })
  }}>{ number }</button>
}

let element = <FunctionComponent />

const root = createRoot(document.getElementById('root'));

root.render(element);