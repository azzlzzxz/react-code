// 此处后面会实现优先级队列
export function scheduleCallback(callback) {
  requestIdleCallback(callback);
}
