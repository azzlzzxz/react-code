import {
  createContainer,
  updateContainer,
} from "react-reconciler/src/ReactFiberReconciler";
import { listenToAllSupportedEvents } from 'react-dom-bindings/src/events/DOMPluginEventSystem';

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}

ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot;
  root.containerInfo.innerHTML = ''; // 更新前置空一下
  updateContainer(children, root);
};

export function createRoot(container) {
  // container ---> div #root
  const root = createContainer(container); // ---> 创建FiberRootNode
  // 监听所有的注册事件
  listenToAllSupportedEvents(container);
  return new ReactDOMRoot(root);
}
