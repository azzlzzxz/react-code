export function initializeUpdateQueue(fiber) {
  // 创建一个新的更新队列
  const queue = {
    shared: {
      pending: null, // 是循环链表
    },
  };
  fiber.updateQueue = queue;
}
