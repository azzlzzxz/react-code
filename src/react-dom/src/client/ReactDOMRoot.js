import { createContainer } from "react-reconciler/src/ReactFiberReconciler";

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}

export function createRoot(container) {
  // container ---> div #root
  const root = createContainer(container); // ---> 创建FiberRootNode

  return new ReactDOMRoot(root);
}
