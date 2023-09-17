import { markUpdateLaneFromFiberToRoot } from "./ReactFiberCocurrentUpdates";

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
  const update = {};
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
