import {
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from "./ReactWorkTags";
import { NoFlags } from "./ReactFiberFlags";
import { NoLanes } from "./ReactFiberLane";

/**
 *
 * @param {*} tag  fiber 类型：函数组件（0）、类组件（1）、原生标签（5）
 * @param {*} pendingProps 新属性，等待处理或生效的属性
 * @param {*} key 唯一标识
 */
export function FiberNode(tag, pendingProps, key) {
  this.tag = tag;
  this.key = key;
  this.type = null; // fiber类型，来自于虚拟DOM节点的type：div、span、p
  // 每个虚拟DOM --> fiber节点 --> 真实DOM
  this.stateNode = null; // 此fiber对应的真实DOM节点
  this.ref = null;

  this.return = null; // 指向父节点
  this.child = null; // 指向第一个子节点
  this.sibling = null; // 指向弟弟节点

  // 虚拟DOM会提供pendingProps，用来创建fiber节点的属性
  this.pendingProps = pendingProps; // 等待生效的属性
  this.memoizedProps = null; // 已经生效的属性

  // 每个fiber都有自己的状态，每种fiber状态存的类型是不一样的，HostRoot存的是要渲染的元素
  this.memoizedState = null; // fiber状态

  // 每个fiber身上可能还有更新队列
  this.updateQueue = null; // 更新的队列

  // 副作用的标识，标识针对此fiber节点进行何种操作（二进制增删改操作）
  this.flags = NoFlags;
  // 子节点对应的副作用标识
  this.subtreeFlags = NoFlags;
  // 存放需要删除的子fiber节点的数组
  this.deletions = null;
  // 替身、轮替
  //我们使用双缓冲池技术，因为我们知道我们最多只需要树的两个版本。
  //我们将可以自由重用的“其他”未使用节点集合在一起。
  this.alternate = null;

  this.index = 0;

  this.lanes = NoLanes;
  this.childLanes = NoLanes;
}

export function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key);
}

export function createHostRootFiber() {
  return createFiber(HostRoot, null, null);
}

/**
 * 基于老的fiber和新的属性，创建新的fiber
 * @param {*} current 老fiber
 * @param {*} pendingProps 新属性
 */
export function createWorkInProgress(current, pendingProps) {
  // 拿到老fiber的论替
  let workInprogress = current.alternate;

  if (workInprogress === null) {
    // 没有就去创建
    workInprogress = createFiber(current.tag, pendingProps, current.key);
    workInprogress.type = current.type;
    workInprogress.stateNode = current.stateNode;

    // 双向指向，互为替身
    workInprogress.alternate = current;
    current.alternate = workInprogress;
  } else {
    // 有就复用老fiber
    workInprogress.pendingProps = pendingProps;
    workInprogress.type = current.type;

    // 清空副作用
    workInprogress.flags = NoFlags;
    workInprogress.subtreeFlags = NoFlags;

    workInprogress.deletions = null;
  }

  workInprogress.child = current.child;
  workInprogress.memoizedProps = current.memoizedProps;
  workInprogress.memoizedState = current.memoizedState;
  workInprogress.updateQueue = current.updateQueue;
  workInprogress.sibling = current.sibling;
  workInprogress.index = current.index;
  workInprogress.ref = current.ref;
  workInprogress.flags = current.flags;
  workInprogress.lanes = current.lanes;
  workInprogress.childLanes = current.childLanes;

  return workInprogress;
}

/**
 * 根据虚拟DOM创建fiber节点
 * @param {*} element
 * @returns
 */
export function createFiberFromElement(element) {
  const { type, key, props: pendingProps } = element;
  return createFiberFromTypeAndProps(type, key, pendingProps);
}

function createFiberFromTypeAndProps(type, key, pendingProps) {
  // 先给tag默认值，IndeterminateComponent不确定的组件类型，后面会根据type来修改tag的值
  let tag = IndeterminateComponent;
  // 如果类型type是一个字符串 span div，说明此fiber类型是一个原生组件
  if (typeof type === "string") {
    tag = HostComponent;
  }
  const fiber = createFiber(tag, pendingProps, key);
  fiber.type = type;
  return fiber;
}

export function createFiberFromText(content) {
  return createFiber(HostText, content, null);
}
