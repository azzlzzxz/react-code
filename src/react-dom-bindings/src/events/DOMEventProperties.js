import { registerTwoPhaseEvent } from "./EventRegistry";

const simpleEventPluginEvents = ["click"];

export const topLevelEventsToReactNames = new Map();

/**
 * onClick在哪里可以取到： 在 createInstance 方法里的
 * function updateFiberProps(domElement, props) { node[internalPropsKey] = props }
 * 真实DOM元素[internalPropsKey] = props props.onClick
 * @param {*} domEventName
 * @param {*} reactName
 */
function registerSimpleEvent(domEventName, reactName) {
  //把原生事件名和处理函数的名字进行映射或者说绑定，click=>onClick
  topLevelEventsToReactNames.set(domEventName, reactName);

  registerTwoPhaseEvent(reactName, [domEventName]); //'onClick' ['click']
}

export function registerSimpleEvents() {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i]; // click
    const domEventName = eventName.toLowerCase(); // click
    const capitalizeEvent = eventName[0].toUpperCase() + eventName.slice(1); // Click
    registerSimpleEvent(domEventName, `on${capitalizeEvent}`); // click,onClick
  }
}
