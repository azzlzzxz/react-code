import ReactSharedInternals from "shared/ReactSharedInternals";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

const { ReactCurrentDispatcher } = ReactSharedInternals;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
}

const HooksDispatcherOnUpdate = {
    useReducer: updateReducer,
}

// 当前函数组件对应的 fiber
let currentlyRenderingFiber = null;
// 当前正在使用中的 hook
let workInProgressHook = null;
// 当前hook对应的老hook
let currentHook = null;

// 更新reducer
function updateReducer(reducer) {
    // 获取新的hook
    const hook = updateWorkInProgressHook();

    // 获取新的hook的更新队列
    const queue = hook.queue;

    // 获取老的hook
    const current = currentHook;

    // 获取将要生效的的更新队列
    const pendingQueue = queue.pending;

    // 初始化一个新状态，取值为当前状态
    let newState = current.memoizedState

    if (pendingQueue !== null) {
      queue.pending = null;
      const firstUpdate = pendingQueue.next;
      let update = firstUpdate
      do {
        const action = update.action
        newState = reducer(newState, action)
        update = update.next
      } while (update !== null && update !== firstUpdate)
    }

    hook.memoizedState = newState;
    const dispatch = queue.dispatch;

    return [hook.memoizedState, dispatch];
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
    }
    if (workInProgressHook === null) {
      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
    return workInProgressHook;
}

// 挂载reducer
function mountReducer(reducer, initialArg) {
    const hook = mountWorkInProgressHook();
    hook.memoizedState = initialArg;
    const queue = {
      pending: null,
      dispatch: null,
    }
    hook.queue = queue;
    const dispatch = (queue.dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber, queue));
    return [hook.memoizedState, dispatch];
}

/**
 * 执行派发动作的方法，它要更新状态，并且让界面重新更新
 * @param {*} fiber function对应的fiber
 * @param {*} queue hook对应的更新队列
 * @param {*} action 派发的动作
 */
function dispatchReducerAction(fiber, queue, action) {
    console.log(fiber, queue, action)
      //在每个hook里会存放一个更新队列，更新队列是一个更新对象的循环链表update1.next=update2.next=update1
    const update = {
        action,//{ type: 'add', payload: 1 } 派发的动作
        next: null//指向下一个更新对象
    }
    //把当前的最新的更新添加到更新队列中，并且返回当前的根fiber
    const root = enqueueConcurrentHookUpdate(fiber, queue, update);
    console.log(root)
    scheduleUpdateOnFiber(root);
}

/**
 * 挂载构建中的hook
 * */
function mountWorkInProgressHook() {
    const hook = {
      memoizedState: null,//hook的状态 0
      queue: null,//存放本hook的更新队列 queue.pending=update的循环链表
      next: null, //指向下一个hook,一个函数里可以会有多个hook,它们会组成一个单向链表
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
 * 渲染函数组件
 * @param {*} current 老fiber
 * @param {*} workInProgress 新fiber
 * @param {*} Component 组件定义
 * @param {*} props 组件属性
 * @returns 虚拟DOM或者说React元素
 */
export function renderWithHooks(current, workInProgress, Component, props) {
    currentlyRenderingFiber = workInProgress; // Function组件对应的 fiber

    // 如果有老的fiber,并且有老的hook链表，进入更新逻辑
    if (current !== null && current.memoizedState !== null) {
        // 需要在函数组件执行前给ReactCurrentDispatcher.current赋值
        ReactCurrentDispatcher.current = HooksDispatcherOnUpdate
    } else {
        ReactCurrentDispatcher.current = HooksDispatcherOnMount;
    }

    const children = Component(props);
    return children;
}