import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import { NoLanes, mergeLanes, isSubsetOfLanes } from "./ReactFiberLane";
import assign from "shared/assign";

// 更新状态
const UpdateState = 0;

export function initializeUpdateQueue(fiber) {
  // debugger;
  // 创建一个新的更新队列
  const queue = {
    baseState: fiber.memoizedState, //本次更新前，当前的fiber的状态,更新会基于它，来进行计算状态
    firstBaseUpdate: null, //本次更新前，该fiber上保存的上次跳过的更新链表头
    lastBaseUpdate: null, //本次更新前，该fiber上保存的上次跳过的更新链尾部
    shared: {
      pending: null, // 是循环链表
    },
  };
  fiber.updateQueue = queue;
}

export function createUpdate(lane) {
  const update = { tag: UpdateState, lane, next: null };
  return update;
}

// 单向循环链表
export function enqueueUpdate(fiber, update, lane) {
  // 获取当前fiber的更新队列
  const updateQueue = fiber.updateQueue;
  //获取共享队列
  const sharedQueue = updateQueue.shared;
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);

  /**************************** 代码变更 *****************************/

  // const pending = updateQueue.shared.pending;
  // if (pending === null) {
  //   // 第一次更新
  //   update.next = update;
  // } else {
  //   // 第n次更新
  //   update.next = pending.next;
  //   pending.next = update;
  // }
  // // pending指向最后一个更新，最后一个更新的next指向第一个更新
  // updateQueue.shared.pending = update;

  // // 返回跟节点，从当前fiber一直到跟节点
  // return markUpdateLaneFromFiberToRoot(fiber);
}

/**
 * 根据老状态和更新队列中的更新计算新状态
 * @param {*} workInProgress 要计算的Fiber
 */
export function processUpdateQueue(workInProgress, nextProps, renderLanes) {
  const queue = workInProgress.updateQueue;
  //老链表头
  let firstBaseUpdate = queue.firstBaseUpdate;
  //老链表尾巴
  let lastBaseUpdate = queue.lastBaseUpdate;
  //新链表尾部
  const pendingQueue = queue.shared.pending;
  //合并新老链表为单链表
  if (pendingQueue !== null) {
    queue.shared.pending = null;
    //新链表尾部
    const lastPendingUpdate = pendingQueue;
    //新链表头部
    const firstPendingUpdate = lastPendingUpdate.next;
    //把老链表剪断，变成单链表
    lastPendingUpdate.next = null;
    //如果没有老链表
    if (lastBaseUpdate === null) {
      //指向新的链表头
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate;
    }
    lastBaseUpdate = lastPendingUpdate;
  }
  //如果链表不为空firstBaseUpdate=>lastBaseUpdate
  if (firstBaseUpdate !== null) {
    //上次跳过的更新前的状态
    let newState = queue.baseState;
    //尚未执行的更新的lane
    let newLanes = NoLanes;
    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;
    let update = firstBaseUpdate;
    do {
      //获取此更新车道
      const updateLane = update.lane;
      //如果说updateLane不是renderLanes的子集的话，说明本次渲染不需要处理过个更新，就是需要跳过此更新
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        //把此更新克隆一份
        const clone = {
          id: update.id,
          lane: updateLane,
          payload: update.payload,
        };
        //如果新的跳过的base链表为空,说明当前这个更新是第一个跳过的更新
        if (newLastBaseUpdate === null) {
          //让新的跳过的链表头和链表尾都指向这个第一次跳过的更新
          newFirstBaseUpdate = newLastBaseUpdate = clone;
          //计算保存新的baseState为此跳过更新时的state
          newBaseState = newState;
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        //如果有跳过的更新，就把跳过的更新所在的赛道合并到newLanes,
        //最后会把newLanes赋给fiber.lanes
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        //说明已经有跳过的更新了
        if (newLastBaseUpdate !== null) {
          const clone = {
            id: update.id,
            lane: 0,
            payload: update.payload,
          };
          newLastBaseUpdate = newLastBaseUpdate.next = clone;
        }
        newState = getStateFromUpdate(update, newState, nextProps);
      }
      update = update.next;
    } while (update);
    //如果没能跳过的更新的话
    if (!newLastBaseUpdate) {
      newBaseState = newState;
    }
    queue.baseState = newBaseState;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;
    workInProgress.lanes = newLanes;
    //本次渲染完会判断，此fiber上还有没有不为0的lane,如果有，会再次渲染
    workInProgress.memoizedState = newState;
  }

  /************************** 代码变更 ******************************/
  // const queue = workInProgress.updateQueue;
  // const pendingQueue = queue.shared.pending;
  // // 如果有更新，或者说更新队列里有内容
  // if (pendingQueue !== null) {
  //   // 清除等待生效的更新
  //   queue.shared.pending = null;
  //   // 获取更新队列中的最后一个更新 update = {payload: {element: h1}}
  //   const lastPendingUpdate = pendingQueue;
  //   // 让最后一个更新的next指向第一个更新
  //   const firstPendingUpdate = lastPendingUpdate.next;
  //   // 把循环链表剪开，变成单向链表
  //   lastPendingUpdate.next = null;
  //   // 获取老状态
  //   let newState = workInProgress.memoizedState;
  //   let update = firstPendingUpdate;
  //   while (update) {
  //     // 根据老状态和更新计算新状态
  //     newState = getStateFromUpdate(update, newState);
  //     update = update.next;
  //   }
  //   // 把最终计算到的状态赋值给memoizedState
  //   workInProgress.memoizedState = newState;
  // }
}

/**
 * 根据老状态和更新计算新状态
 * @param {*} update 更新的对象其实有很多种类型
 * @param {*} prevState 老状态
 */
function getStateFromUpdate(update, prevState, nextProps) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update;
      let partialState;
      if (typeof payload === "function") {
        partialState = payload.call(null, prevState, nextProps);
      } else {
        partialState = payload;
      }
      return assign({}, prevState, partialState);
  }

  /********************** 代码变更 ********/
  // switch (update.tag) {
  //   case UpdateState:
  //     // payload是一个对象，里面有新的状态
  //     const { payload } = update;
  //     return assign({}, prevState, payload);
  // }
}

// 从老的fiber中clone一份更新队列给新fiber
export function cloneUpdateQueue(current, workInProgress) {
  const workInProgressQueue = workInProgress.updateQueue;
  const currentQueue = current.updateQueue;
  //如果新的队列和老的队列是同一个对象的话
  if (currentQueue === workInProgressQueue) {
    const clone = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared,
    };
    workInProgress.updateQueue = clone;
  }
}
