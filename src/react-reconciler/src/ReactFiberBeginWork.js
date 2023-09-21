import logger from "shared/logger";
import { HostRoot, HostComponent, HostText } from "./ReactWorkTags";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";

/**
 * 根据新的虚拟DOM构建新的fiber子链表
 * @param {*} current 老的父fiber
 * @param {*} workInProgress 新的父fiber
 * @param {*} nextChildren 新的虚拟DOM
 * @returns
 */
function reconcileChildren(current, workInProgress, nextChildren) {
  // 如果此新fiber没有老fiber，说明此新fiber是新创建的不是更新的
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // 如果此新fiber有老fiber，说明此新fiber是更新的不是新创建的，需要做DOM-DIFF，拿老的子fiber链表和新的子虚拟DOM进行最小化更新
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    );
  }
}

function updateHostRoot(current, workInProgress) {
  // 需要知道它的子虚拟DOM，知道它的儿子的虚拟DOM信息
  processUpdateQueue(workInProgress); // workInProgress.memoizedState = { element }

  const nextState = workInProgress.memoizedState;
  // nextChildren是新的子虚拟DOM
  const nextChildren = nextState.element;
  // 协调子节点，DOM-DIFF在其中
  // 根据新的虚拟DOM生成子Fiber链表
  reconcileChildren(current, workInProgress, nextChildren);

  return workInProgress.child; // 根据新的虚拟DOM计算新的子节点
}

function updateHostComponent(current, workInProgress) {
  return null;
}

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
