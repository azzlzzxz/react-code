import { createHostRootFiber } from "./ReactFiber";

function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo; // div #root
}

export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo);
  // HostRoot指的是根节点div #root
  const uninitializedFiber = createHostRootFiber();
  // 根容器的current指向渲染好的根Fiber
  root.current = uninitializedFiber;
  // 根节点的Fiber的stateNode（真实DOM）指向根节点FiberRootNode
  uninitializedFiber.stateNode = root;
  return root;
}
