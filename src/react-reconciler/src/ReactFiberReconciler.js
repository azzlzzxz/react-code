import { createFiberRoot } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import {
  scheduleUpdateOnFiber,
  requestUpdateLane,
  requestEventTime,
} from "./ReactFiberWorkLoop";

// 创建容器
export function createContainer(containerInfo) {
  return createFiberRoot(containerInfo);
}

/**
 * 更新容器 把虚拟DOM，element转换成真实DOM插入到container容器中
 * @param {*} element 虚拟DOM
 * @param {*} container 容器 FiberRootNode
 */
export function updateContainer(element, container) {
  // 获取当前根fiber
  const current = container.current;
  // 请求事件发生时间
  const eventTime = requestEventTime();
  //请求一个更新车道
  const lane = requestUpdateLane(current);
  // 创建更新
  const update = createUpdate(lane);
  // payload是要更新的虚拟DOM
  update.payload = { element };

  // 将update（更新对象）插入到当前fiber的更新队列中，返回根节点
  const root = enqueueUpdate(current, update, lane);

  scheduleUpdateOnFiber(root, current, lane, eventTime);
}
