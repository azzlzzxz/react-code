import { createHostRootFiber } from "./ReactFiber";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { NoLanes, NoLane, createLaneMap, NoTimestamp } from "./ReactFiberLane";

function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo; // div #root
  //表示此根上有哪些赛道等待被处理
  this.pendingLanes = NoLanes;
  this.callbackNode = null;
  this.callbackPriority = NoLane;
  //过期时间 存放每个赛道过期时间
  this.expirationTimes = createLaneMap(NoTimestamp);
  //过期的赛道
  this.expiredLanes = NoLanes;
}

export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo);
  // HostRoot指的是根节点div #root 的Fiber节点
  const uninitializedFiber = createHostRootFiber();
  // 根容器的current指向渲染好的根Fiber
  root.current = uninitializedFiber;
  // 根节点的Fiber的stateNode（真实DOM）指向根节点FiberRootNode
  uninitializedFiber.stateNode = root;
  // 初始化更新队列
  initializeUpdateQueue(uninitializedFiber);
  return root;
}
