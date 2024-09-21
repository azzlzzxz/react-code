import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import { NoFlags, MutationMask } from "./ReactFiberFlags";
import { commitMutationEffectsOnFiber } from './ReactFiberCommitWork'
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";

let workInProgress = null; // 正在进行中的任务
let workInProgressRoot = null // 当前正在调度的跟节点

/**
 * 计划更新root
 * 源码此处有一个任务调度的功能
 * @param {*} root
 */
export function scheduleUpdateOnFiber(root) {
  // 确保调度执行root上的更新
  ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root) {
  if (workInProgressRoot) return;
  workInProgressRoot = root
  // 告诉浏览器要执行performConcurrentWorkOnRoot
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root));
}

function commitRoot(root) {
  const { finishedWork } = root;
  // 判断子树里有没有副作用 （插入/更新等）
  const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask)!== NoFlags
  // 判断根fiber自己有没有副作用
  const rootHasEffect = (finishedWork.flags & MutationMask)!== NoFlags
  // 如果自己有副作用或子节点有副作用那就进行提交DOM操作
  if (subtreeHasEffects || rootHasEffect){
    // console.log('commitRoot', finishedWork.child)

    // 提交的变更 副作用 在 fiber 上
    commitMutationEffectsOnFiber(finishedWork, root)
  }

  // 等DOM变更后，root 的 current属性指向新fiber树
  root.current = finishedWork
}

/**
 * 根据虚拟DOM构建fiber树，要创建真实的DOM节点，还需要把真实的DOM节点插入容器
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root) {
  // 第一次渲染是以同步的方式渲染根节点，初次渲染的时候，都是同步的
  renderRootSync(root);

  // 开始进入提交阶段，就是执行副作用，修改真实DOM
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  workInProgressRoot = null
}

// 创建一个新栈
function prepareFreshStack(root) {
  // 创建根节点的新fiber
  workInProgress = createWorkInProgress(root.current, null);

  finishQueueingConcurrentUpdates(); // 在工作循环之前完成更新队列的收集
  // console.log("workInProgress", workInProgress);
}

// 开始构建fiber树
function renderRootSync(root) {
  prepareFreshStack(root);
  workLoopSync();
}

// 工作循环同步
function workLoopSync() {
  while (workInProgress !== null) {
    // 执行工作单元
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // 获取新的fiber对应的老fiber
  const current = unitOfWork.alternate;
  // 完成当前fiber的子fiber链表构建后
  const next = beginWork(current, unitOfWork);
  // 把带生效属性变成已生效
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next === null) {
    // 如果没有子节点，表示当前fiber已经完成了
    completeUnitOfWork(unitOfWork);
  } else {
    // 如果有子节点，就让子节点成为下一个工作单元
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    //执行此fiber 的完成工作,如果是原生组件的话就是创建真实的DOM节点
    completeWork(current, completedWork);
    //如果有弟弟，就构建弟弟对应的fiber子链表
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    //如果没有弟弟，说明这当前完成的就是父fiber的最后一个节点
    //也就是说一个父fiber,所有的子fiber全部完成了
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
