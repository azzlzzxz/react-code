import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import { Placement } from "./ReactFiberFlags";

import isArray from "shared/isArray";

/**
 *
 * @param {*} shouldTrackSideEffects 是否跟踪副作用
 */
function createChildReconciler(shouldTrackSideEffects) {
  function useFiber(fiber, pendingProps) {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  function createChild(returnFiber, newChild) {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const created = createFiberFromText(`${newChild}`);
      created.return = returnFiber;
      return created;
    }
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(newChild);
          created.ref = newChild.ref;
          created.return = returnFiber;
          return created;
        }
        default:
          break;
      }
    }
    return null;
  }

  /**
   * 单节点协调
   * @param {*} returnFiber 根fiber div#root对应的fiber
   * @param {*} currentFirstChild 老的FunctionComponent对应的fiber
   * @param {*} element 新的虚拟DOM对象
   * @returns 返回新的第一个子fiber
   */
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    //新的虚拟DOM的key,也就是唯一标准
    const key = element.key; // null
    let child = currentFirstChild; // 老的FunctionComponent对应的fiber
    while (child !== null) {
      //判断此老fiber对应的key和新的虚拟DOM对应的key是否一样 null===null
      if (child.key === key) {
        //判断老fiber对应的类型和新虚拟DOM元素对应的类型是否相同
        if (child.type === element.type) {
          // p div
          //如果key一样，类型也一样，则认为此节点可以复用
          const existing = useFiber(child, element.props);
          existing.return = returnFiber;
          return existing;
        }
      }
      child = child.sibling;
    }
    // 在初次挂载时，那么老节点currentFirstFiber肯定是没有的，所以可以根据虚拟DOM创建fiber节点
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
  }

  /**
   * 设置副作用（增删改）
   * @param {*} newFiber
   * @returns
   */
  function placeSingleChild(newFiber) {
    // 说明要添加副作用 并且他的老fiber是null，才需要插入
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      // 要在提交阶段插入此节点
      // React渲染分为渲染（创建Fiber树）和提交（更新真实DOM）两个阶段
      newFiber.flags |= Placement; // Placement 这个新fiber需要变成DOM，插入到dom中
    }
    return newFiber;
  }

  function placeChild(newFiber, newIdx) {
    //指定新的fiber在新的挂载索引
    newFiber.index = newIdx;
    //如果不需要跟踪副作用
    if (shouldTrackSideEffects) {
      newFiber.flags |= Placement;
    }
  }

  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    let resultingFirstChild = null; //返回的第一个新节点
    let previousNewFiber = null; //上一个的新fiber
    let newIdx = 0; //用来遍历新的虚拟DOM的索引

    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChildren[newIdx]);
      if (newFiber === null) continue;
      placeChild(newFiber, newIdx);
      //如果previousNewFiber为null，说明这是第一个fiber
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber; //这个newFiber就是第一个子节点
      } else {
        //否则说明不是第一个子节点，就把这个newFiber添加上一个子节点后面
        previousNewFiber.sibling = newFiber;
      }
      //让newFiber成为最后一个或者说上一个子fiber
      previousNewFiber = newFiber;
    }

    return resultingFirstChild;
  }

  /**
   * 比较子fiber
   * DOM-DIFF 用老的子fiber链表和新的虚拟DOM进行比较的过程
   * @param {*} returnFiber 新的父fiber
   * @param {*} currentFirstChild 老fiber的第一个子fiber，current一般指的是老的意思
   * @param {*} newChild 新的子虚拟DOM （h1 虚拟DOM）
   */
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild) {
    // 现在暂时考虑新的虚拟DOM只有一个的情况
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        // 如果是react元素
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            // 协调单节点
            reconcileSingleElement(returnFiber, currentFirstChild, newChild)
          );
        default:
          break;
      }
    }
    //newChild [hello文本节点,span虚拟DOM元素]
    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
    }

    return null;
  }

  return reconcileChildFibers;
}

// 有老fiber更新的时候用这个
export const reconcileChildFibers = createChildReconciler(true);
// 如果没有老父fiber，节点初次挂载的的时候用这个
export const mountChildFibers = createChildReconciler(false);
