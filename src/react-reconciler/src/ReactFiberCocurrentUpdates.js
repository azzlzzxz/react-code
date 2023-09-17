import { HostRoot } from "./ReactWorkTags";

/**
 * 本来此文件要处理更新优先级的问题
 * 目前只实现向上找跟节点
 */
export function markUpdateLaneFromFiberToRoot(sourceFiber) {
  let node = sourceFiber; // 当前Fiber
  let parent = sourceFiber.return; // 当前Fiber的父Fiber
  while (parent !== null) {
    node = parent;
    parent = parent.return;
  }

  // 一直找到parent为null
  if ((node.tag = HostRoot)) {
    return node.stateNode;
  }
  return null;
}
