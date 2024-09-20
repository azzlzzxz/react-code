import ReactSharedInternals from "shared/ReactSharedInternals";

const { ReactCurrentDispatcher } = ReactSharedInternals;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
}

// 当前函数组件对应的 fiber
let currentlyRenderingFiber = null;
// 当前正在使用中的 hook
let workInProgressHook = null;

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

    // 需要在函数组件执行前给ReactCurrentDispatcher.current赋值
    ReactCurrentDispatcher.current = HooksDispatcherOnMount

    const children = Component(props);
    return children;
}