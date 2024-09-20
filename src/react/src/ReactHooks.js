import ReactCurrentDispatcher from './ReactCurrentDispatcher';

function resolveDispatcher() {
    return ReactCurrentDispatcher.current
}

/**
 * 在函数执行前给ReactCurrentDispatcher.current 赋值
 * @param {*} reducer 处理函数，用于根据老状态和动作计算新状态
 * @param {*} initialArg 初始状态
 */
export function useReducer(reducer, initialArg) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useReducer(reducer, initialArg);
}