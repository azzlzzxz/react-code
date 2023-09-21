import { markUpdateLaneFromFiberToRoot } from "./ReactFiberCocurrentUpdates";
import assign from "shared/assign";

// 更新状态
const UpdateState = 0;

export function initializeUpdateQueue(fiber) {
  // 创建一个新的更新队列
  const queue = {
    shared: {
      pending: null, // 是循环链表
    },
  };
  fiber.updateQueue = queue;
}

export function createUpdate() {
  const update = { tag: UpdateState };
  return update;
}

// 单向循环链表
export function enqueueUpdate(fiber, update) {
  // 获取当前fiber的更新队列
  const updateQueue = fiber.updateQueue;
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    // 第一次更新
    update.next = update;
  } else {
    // 第n次更新
    update.next = pending.next;
    pending.next = update;
  }
  // pending指向最后一个更新，最后一个更新的next指向第一个更新
  updateQueue.shared.pending = update;

  // 返回跟节点，从当前fiber一直到跟节点
  return markUpdateLaneFromFiberToRoot(fiber);
}

/**
 * 根据老状态和更新队列中的更新计算新状态
 * @param {*} workInProgress 要计算的Fiber
 */
export function processUpdateQueue(workInProgress) {
  const queue = workInProgress.updateQueue;
  const pendingQueue = queue.shared.pending;
  // 如果有更新，或者说更新队列里有内容
  if (pendingQueue !== null) {
    // 清除等待生效的更新
    queue.shared.pending = null;
    // 获取更新队列中的最后一个更新 update = {payload: {element: h1}}
    const lastPendingUpdate = pendingQueue;
    // 让最后一个更新的next指向第一个更新
    const firstPendingUpdate = lastPendingUpdate.next;
    // 把循环链表剪开，变成单向链表
    lastPendingUpdate.next = null;
    // 获取老状态
    let newState = workInProgress.memoizedState;
    let update = firstPendingUpdate;
    while (update) {
      // 根据老状态和更新计算新状态
      newState = getStateFromUpdate(update, newState);
      update = update.next;
    }
    // 把最终计算到的状态赋值给memoizedState
    workInProgress.memoizedState = newState;
  }
}

/**
 * 根据老状态和更新计算新状态
 * @param {*} update 更新的对象其实有很多种类型
 * @param {*} prevState 老状态
 */
function getStateFromUpdate(update, prevState) {
  switch (update.tag) {
    case UpdateState:
      // payload是一个对象，里面有新的状态
      const { payload } = update;
      return assign({}, prevState, payload);
  }
}
