import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalSchedulerPriority,
} from "../../scheduler/src/forks/Scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import {
  NoFlags,
  MutationMask,
  ChildDeletion,
  Placement,
  Update,
  Passive,
} from "./ReactFiberFlags";
import {
  commitMutationEffectsOnFiber, //执行DOM操作
  commitPassiveUnmountEffects, //执行destroy
  commitPassiveMountEffects, //执行create
  commitLayoutEffects,
} from "./ReactFiberCommitWork";
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";

let workInProgress = null; // 正在进行中的任务
let workInProgressRoot = null; // 当前正在调度的跟节点
let rootDoesHavePassiveEffect = false; // 此根节点上有没有useEffect的类似副作用
let rootWithPendingPassiveEffects = null; // 具有useEffect副作用的跟节点（FiberRootNode，根fiber.stateNode）

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
  workInProgressRoot = root;
  // 告诉浏览器要执行performConcurrentWorkOnRoot
  scheduleCallback(NormalSchedulerPriority, performConcurrentWorkOnRoot.bind(null, root));
}

// 刷新副作用，在构建之后执行
function flushPassiveEffect() {
  if (rootWithPendingPassiveEffects !== null) {
    // 有需要执行副作用的根
    const root = rootWithPendingPassiveEffects;
    // 先执行卸载副作用，destroy
    commitPassiveUnmountEffects(root.current);
    // 再执行挂载副作用 create
    commitPassiveMountEffects(root, root.current);
  }
}

function commitRoot(root) {
  // 获取新构建好的fiber树的根fiber
  const { finishedWork } = root;
  // 如果新的根fiber的子节点有effect的副作用 或 自身上有effect的副作用
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true; // 表示跟上有要执行的副作用
      // scheduleCallback 不会立刻执行，它会开启一个宏任务，在构建之后执行
      scheduleCallback(NormalSchedulerPriority, flushPassiveEffect);
    }
  }
  // 判断子树里有没有副作用 （插入/更新等）
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  // 判断根fiber自己有没有副作用
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  // 如果自己有副作用或子节点有副作用那就进行提交DOM操作
  if (subtreeHasEffects || rootHasEffect) {
    // 提交的变更 副作用 在 fiber 上，执行DOM变更
    commitMutationEffectsOnFiber(finishedWork, root);
    // 同步执行LayoutEffect
    commitLayoutEffects(finishedWork, root);

    // 提交变更后，把root（根节点）赋值给rootWithPendingPassiveEffects，再下个宏任务里 flushPassiveEffect 执行时就能拿到root
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false;
      rootWithPendingPassiveEffects = root;
    }
  }

  // 等DOM变更后，root 的 current属性指向新fiber树
  root.current = finishedWork;
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
  printFiber(finishedWork);

  root.finishedWork = finishedWork;

  // 提交
  commitRoot(root);
  workInProgressRoot = null;
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

/******************************** 副作用执行日志打印 ********************************/

function printFiber(fiber) {
  /*
  fiber.flags &= ~Forked;
  fiber.flags &= ~PlacementDEV;
  fiber.flags &= ~Snapshot;
  fiber.flags &= ~PerformedWork;
  */
  if (fiber.flags !== 0) {
    console.log(
      getFlags(fiber.flags),
      getTag(fiber.tag),
      typeof fiber.type === "function" ? fiber.type.name : fiber.type,
      fiber.memoizedProps
    );
    if (fiber.deletions) {
      for (let i = 0; i < fiber.deletions.length; i++) {
        const childToDelete = fiber.deletions[i];
        console.log(
          getTag(childToDelete.tag),
          childToDelete.type,
          childToDelete.memoizedProps
        );
      }
    }
  }
  let child = fiber.child;
  while (child) {
    printFiber(child);
    child = child.sibling;
  }
}
function getTag(tag) {
  switch (tag) {
    case FunctionComponent:
      return `FunctionComponent`;
    case HostRoot:
      return `HostRoot`;
    case HostComponent:
      return `HostComponent`;
    case HostText:
      return HostText;
    default:
      return tag;
  }
}
function getFlags(flags) {
  if (flags === (Update | Placement | ChildDeletion)) {
    return `自己移动和子元素有删除`;
  }
  if (flags === (ChildDeletion | Update)) {
    return `自己有更新和子元素有删除`;
  }
  if (flags === ChildDeletion) {
    return `子元素有删除`;
  }
  if (flags === (Placement | Update)) {
    return `移动并更新`;
  }
  if (flags === Placement) {
    return `插入`;
  }
  if (flags === Update) {
    return `更新`;
  }
  return flags;
}
