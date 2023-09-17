import logger from "shared/logger";
import { HostRoot, HostComponent, HostText } from "./ReactWorkTags";

function updateHostRoot(current, workInProgress) {
  // 需要知道它的子虚拟DOM，知道它的儿子的虚拟DOM信息
  processUpdateQueue(workInProgress); // workInProgress.memoizedState = { element }

  const nextState = workInProgress.memoizedState;
  const nextChildren = nextState.element;
  // 协调子节点，DOM-DIFF在其中
  reconcileChildren(current, workInProgress, nextChildren);

  return workInProgress.child; // 根据新的虚拟DOM计算新的子节点
}

function updateHostComponent(current, workInProgress) {}

/**
 * 目标是根据新的虚拟DOM构建新的fiber子链表
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @returns
 */
export function beginWork(current, workInProgress) {
  logger("beginWork", workInProgress);
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case HostText:
      return null;
    default:
      return null;
  }
}
