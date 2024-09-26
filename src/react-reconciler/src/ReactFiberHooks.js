import ReactSharedInternals from "shared/ReactSharedInternals";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from "./ReactFiberFlags";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout,
} from "./ReactHookEffectTags";
import { NoLanes, NoLane, mergeLanes, isSubsetOfLanes } from "./ReactFiberLane";
import {
  requestUpdateLane,
  requestEventTime,
  scheduleUpdateOnFiber,
} from "./ReactFiberWorkLoop";

const { ReactCurrentDispatcher } = ReactSharedInternals;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
  useRef: mountRef,
};

const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
  useRef: updateRef,
};

// 当前函数组件对应的 fiber
let currentlyRenderingFiber = null;
// 当前正在使用中的 hook
let workInProgressHook = null;
// 当前hook对应的老hook
let currentHook = null;
// 当前渲染优先级
let renderLanes = NoLanes;

/************************************ 公共方法 *************************************/
/**
 * 挂载构建中的hook
 * */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, //hook的状态 0
    queue: null, //存放本hook的更新队列 queue.pending=update的循环链表
    next: null, //指向下一个hook,一个函数里可以会有多个hook,它们会组成一个单向链表
    baseState: null, //第一跳过的更新前的状态
    baseQueue: null, //跳过的更新的链表
  };
  if (workInProgressHook === null) {
    //当前函数对应的fiber的状态等于第一个hook对象
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

/**
 * 构建新的hooks
 */
function updateWorkInProgressHook() {
  //获取将要构建的新的hook的老hook
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  //根据老hook创建新hook
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
  };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}

/************************************ useLayoutEffect 实现 ****************************************/

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

/************************************ useReducer 实现 *************************************/
// 更新reducer
function updateReducer(reducer) {
  // 获取新的hook
  const hook = updateWorkInProgressHook();
  // 获取新的hook的更新队列
  const queue = hook.queue;
  queue.lastRenderedReducer = reducer;
  // 获取老的hook
  const current = currentHook;
  let baseQueue = current.baseQueue;
  // 获取将要生效的的更新队列
  const pendingQueue = queue.pending;
  //把新旧更新链表合并
  if (pendingQueue !== null) {
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  if (baseQueue !== null) {
    printQueue(baseQueue);
    const first = baseQueue.next;
    let newState = current.baseState;
    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let update = first;
    do {
      const updateLane = update.lane;
      const shouldSkipUpdate = !isSubsetOfLanes(renderLanes, updateLane);
      if (shouldSkipUpdate) {
        const clone = {
          lane: updateLane,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null,
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane
        );
      } else {
        if (newBaseQueueLast !== null) {
          const clone = {
            lane: NoLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null,
          };
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
        if (update.hasEagerState) {
          newState = update.eagerState;
        } else {
          const action = update.action;
          newState = reducer(newState, action);
        }
      }
      update = update.next;
    } while (update !== null && update !== first);
    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
    }
    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = newState;
  }
  if (baseQueue === null) {
    queue.lanes = NoLanes;
  }
  const dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];

  /************************代码变更 ************************/
  // // 获取新的hook
  // const hook = updateWorkInProgressHook();

  // // 获取新的hook的更新队列
  // const queue = hook.queue;

  // // 获取老的hook
  // const current = currentHook;

  // // 获取将要生效的的更新队列
  // const pendingQueue = queue.pending;

  // // 初始化一个新状态，取值为当前状态
  // let newState = current.memoizedState;

  // if (pendingQueue !== null) {
  //   queue.pending = null;
  //   const firstUpdate = pendingQueue.next;
  //   let update = firstUpdate;
  //   do {
  //     if (update.hasEagerState) {
  //       newState = update.eagerState;
  //     } else {
  //       const action = update.action;
  //       newState = reducer(newState, action);
  //     }
  //     update = update.next;
  //   } while (update !== null && update !== firstUpdate);
  // }

  // //计算好新的状态后，不但要改变hook的状态，也要改变hook上队列的lastRenderedState
  // hook.memoizedState = queue.lastRenderedState = newState;
  // const dispatch = queue.dispatch;

  // return [hook.memoizedState, dispatch];
}

// 挂载reducer
function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  return [hook.memoizedState, dispatch];
}

/**
 * 执行派发动作的方法，它要更新状态，并且让界面重新更新
 * @param {*} fiber function对应的fiber
 * @param {*} queue hook对应的更新队列
 * @param {*} action 派发的动作
 */
function dispatchReducerAction(fiber, queue, action) {
  const lane = requestUpdateLane();
  // console.log(fiber, queue, action);
  //在每个hook里会存放一个更新队列，更新队列是一个更新对象的循环链表update1.next=update2.next=update1
  const update = {
    action, //{ type: 'add', payload: 1 } 派发的动作
    next: null, //指向下一个更新对象
  };
  //把当前的最新的更新添加到更新队列中，并且返回当前的根fiber
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  // console.log(root);
  const eventTime = requestEventTime();
  scheduleUpdateOnFiber(root, fiber, lane, eventTime);
}

/************************************ useState 实现 *************************************/

/**
 * hook的属性
 * hook.memoizedState 当前 hook真正显示出来的状态
 * hook.baseState 第一个跳过的更新之前的老状态
 * hook.queue.lastRenderedState 上一个计算的状态
 */
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: baseStateReducer, //上一个reducer
    lastRenderedState: initialState, //上一个state
  };
  hook.queue = queue;
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));
  return [hook.memoizedState, dispatch];
}

//useState其实就是一个内置了reducer的useReducer
function baseStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}

function updateState(initialState) {
  return updateReducer(baseStateReducer, initialState);
}

function dispatchSetState(fiber, queue, action) {
  // 获取当前的更新赛道 (点击事件就是 1)
  const lane = requestUpdateLane();
  const update = {
    lane,
    action,
    hasEagerState: false, //是否有急切的更新
    eagerState: null, //急切的更新状态
    next: null,
  };

  const alternate = fiber.alternate;

  //当你派发动作后，我立刻用上一次的状态和上一次的reducer计算新状态
  //只有第一个更新都能进行此项优化
  if (
    fiber.lanes === NoLanes &&
    (alternate === null || alternate.lanes == NoLanes)
  ) {
    //先获取队列上的老的状态和老的reducer
    const { lastRenderedReducer, lastRenderedState } = queue;
    //使用上次的状态和上次的reducer结合本次action进行计算新状态
    const eagerState = lastRenderedReducer(lastRenderedState, action);
    update.hasEagerState = true;
    update.eagerState = eagerState;
    if (Object.is(eagerState, lastRenderedState)) {
      console.log("上次的状态和当前状态一样，不触发调度更新");
      return;
    }
  }

  //下面是真正的入队更新，并调度更新逻辑
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  const eventTime = requestEventTime();

  scheduleUpdateOnFiber(root, fiber, lane, eventTime);
}

/************************************ useEffect 实现 *************************************/

// 挂载effect
function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}

/**
 *
 * @param {*} fiberFlags fiber里有useEffect对应的标识
 * @param {*} hookFlags useEffect这个hook对应的标识
 * @param {*} create useEffect里的回调函数
 * @param {*} deps useEffect的依赖数组
 */
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  // 给当前的函数组件fiber添加flags
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  );
}

/**
 * 添加effect链表
 * @param {*} tag effect的标签
 * @param {*} create 创建方法
 * @param {*} destroy 销毁方法
 * @param {*} deps 依赖数组
 */
function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null,
  };
  // 当前函数组件的fiber 里的更新队列
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if (componentUpdateQueue === null) {
    // updateQueue为null，就创建一个更新队列
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    // 把新创建的updateQueue赋值给，当前函数组件的fiber 里的更新队列
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    // 让lastEffect指向最后一个effect，构成循环链表
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    // updateQueue存在，就获取lastEffect
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      // lastEffect === null，让lastEffect指向最后一个effect，构成循环链表
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      // 往循环链表里加，第一个effect指向下一个，最后一个effect指向第一个
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}

function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null,
  };
}

// 更新effect
function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy;
  // 上一个老hook
  if (currentHook !== null) {
    // 获取此useEffect这个Hook上老的effect对象 (create deps destroy)
    const prevEffect = currentHook.memoizedState;
    // 获取destroy方法
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // 用新数组和老数组进行对比，如果一样的话
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        //不管要不要重新执行，都需要把新的effect组成完整的循环链表放到fiber.updateQueue中，未下次更新做准备
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }
  // 如果要执行effect的话需要修改fiber的flags
  currentlyRenderingFiber.flags |= fiberFlags;
  // 如果要执行hook的话 添加HookHasEffect flag
  // Passive已经代表了useEffect，为什么还需HookHasEffect,因为不是每个Passive都会执行的
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps
  );
}

// 新和老的两个依赖数组的比对
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return null;
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

/************************************ useRef 实现 *************************************/

function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = {
    current: initialValue,
  };
  hook.memoizedState = ref;
  return ref;
}
function updateRef() {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

/************************************ renderWithHooks 入口函数 *************************************/

/**
 * 渲染函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component 组件定义
 * @param {*} props 组件属性
 * @returns 虚拟DOM或者说React元素
 */
export function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  nextRenderLanes
) {
  //当前正在渲染的车道
  renderLanes = nextRenderLanes;

  // Function组件对应的 fiber
  currentlyRenderingFiber = workInProgress;

  // 函数组件更新队列里存的effect（因为每次渲染都会构建新的updateQueue，所以在渲染之前要清空，否则会重复）
  workInProgress.updateQueue = null;

  // 函数组件状态存的hooks的链表
  workInProgress.memoizedState = null;

  // 如果有老的fiber,并且有老的hook链表，进入更新逻辑
  if (current !== null && current.memoizedState !== null) {
    // 需要在函数组件执行前给ReactCurrentDispatcher.current赋值
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }

  const children = Component(props);
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLanes = NoLanes;

  return children;
}

/****************************** 打印测试代码 ******************************/
function printQueue(queue) {
  const first = queue.next;
  let desc = "";
  let update = first;
  do {
    desc += "=>" + update.action.id;
    update = update.next;
  } while (update !== null && update !== first);
  desc += "=>null";
  console.log(desc);
}
