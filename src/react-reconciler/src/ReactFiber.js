import { HostRoot } from "./ReactWorkTags";
import { NoFlags } from "./ReactFiberFlags";

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
  // 替身、轮替
  //我们使用双缓冲池技术，因为我们知道我们最多只需要树的两个版本。
  //我们将可以自由重用的“其他”未使用节点集合在一起。
  this.alternate = null;
}

export function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key);
}

export function createHostRootFiber() {
  return createFiber(HostRoot, null, null);
}
