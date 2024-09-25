import {
  scheduleCallback as Scheduler_scheduleCallback,
  shouldYield,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
} from "../src/Scheduler";
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
import {
  getCurrentUpdatePriority,
  lanesToEventPriority,
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  IdleEventPriority,
  setCurrentUpdatePriority,
} from "./ReactEventPriorities";
import { getCurrentEventPriority } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import {
  NoLanes,
  SyncLane,
  markRootUpdated,
  getNextLanes,
  getHighestPriorityLane,
  includesBlockingLane,
} from "./ReactFiberLane";
import {
  scheduleSyncCallback,
  flushSyncCallbacks,
} from "./ReactFiberSyncTaskQueue";

let workInProgress = null; // 正在进行中的任务
let workInProgressRoot = null; // 当前正在调度的跟节点
let rootDoesHavePassiveEffect = false; // 此根节点上有没有useEffect的类似副作用
let rootWithPendingPassiveEffects = null; // 具有useEffect副作用的跟节点（FiberRootNode，根fiber.stateNode）
let workInProgressRootRenderLanes = NoLanes; // 当前正在指定的渲染优先级

//构建fiber树正在进行中
const RootInProgress = 0;
//构建fiber树已经完成
const RootCompleted = 5;
//当渲染工作结束的时候当前的fiber树处于什么状态,默认进行中
let workInProgressRootExitStatus = RootInProgress;

/**
 * 计划更新root
 * 源码此处有一个任务调度的功能
 * @param {*} root
 */
export function scheduleUpdateOnFiber(root, fiber, lane) {
  markRootUpdated(root, lane);
  // 确保调度执行root上的更新
  ensureRootIsScheduled(root);
}

function ensureRootIsScheduled(root) {
  //获取当前优先级最高的车道
  const nextLanes = getNextLanes(root, workInProgressRootRenderLanes);
  //如果没有要执行的任务
  if (nextLanes === NoLanes) {
    return;
  }

  // 获取新的调度优先级
  const newCallbackPriority = getHighestPriorityLane(nextLanes);

  //新的回调任务
  let newCallbackNode = null;

  // 如果新的优先级是同步的话
  if (newCallbackPriority === SyncLane) {
    //先把performSyncWorkOnRoot添回到同步队列中
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    //再把flushSyncCallbacks放入微任务
    queueMicrotask(flushSyncCallbacks);
    //如果是同步执行的话
    newCallbackNode = null;
  } else {
    //如果不是同步，就需要调度一个新的任务
    let schedulerPriorityLevel;
    switch (
      lanesToEventPriority(nextLanes) // ===>  (lanesToEventPriority 方法 是把赛道优先级转成事件优先级)
    ) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediateSchedulerPriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority;
        break;
      default:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
    }

    newCallbackNode = Scheduler_scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }

  //在根节点上执行的任务是newCallbackNode
  root.callbackNode = newCallbackNode;

  /**************************** 上面的代码变更前 *****************************/
  // if (workInProgressRoot) return;
  // workInProgressRoot = root;
  // // 告诉浏览器要执行performConcurrentWorkOnRoot
  // scheduleCallback(
  //   NormalSchedulerPriority,
  //   performConcurrentWorkOnRoot.bind(null, root)
  // );
}

/**
 * 在根上执行同步工作
 */
function performSyncWorkOnRoot(root) {
  //获得最高优的lane
  const lanes = getNextLanes(root);
  //渲染新的fiber树
  renderRootSync(root, lanes);
  //获取新渲染完成的fiber根节点
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  return null;
}

/**
 * 根据虚拟DOM构建fiber树，要创建真实的DOM节点，还需要把真实的DOM节点插入容器
 * @param {*} root
 */
function performConcurrentWorkOnRoot(root, didTimeout) {
  //先获取当前根节点上的任务
  const originalCallbackNode = root.callbackNode;
  //获取当前优先级最高的车道
  const lanes = getNextLanes(root, NoLanes); //16
  if (lanes === NoLanes) {
    return null;
  }

  //如果不包含阻塞的车道，并且没有超时，就可以并行渲染,就是启用时间分片
  //所以说默认更新车道是同步的,不能启用时间分片
  //是否不包含阻塞车道
  const nonIncludesBlockingLane = !includesBlockingLane(root, lanes);

  //时间片没有过期
  const nonTimeout = !didTimeout;

  //都是真，才能进行时间分片，也就是进行并发渲染，也就是可以中断执行
  const shouldTimeSlice = nonIncludesBlockingLane && nonTimeout;

  const exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);

  //如果不是渲染中的话，那说明肯定渲染完了
  if (exitStatus !== RootInProgress) {
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    commitRoot(root);
  }

  //说明任务没有完成
  if (root.callbackNode === originalCallbackNode) {
    //把此函数返回，下次接着执行
    return performConcurrentWorkOnRoot.bind(null, root);
  }

  return null;

  /********************************* 代码变更 **********************************/
  // //获取当前优先级最高的车道
  // const lanes = getNextLanes(root);
  // //如果没有要执行的任务
  // if (lanes === NoLanes) {
  //   return;
  // }
  // // 第一次渲染是以同步的方式渲染根节点，初次渲染的时候，都是同步的
  // renderRootSync(root, lanes);
  // // 开始进入提交阶段，就是执行副作用，修改真实DOM
  // const finishedWork = root.current.alternate;

  // /******** 测试打印 *********/
  // printFiber(finishedWork);

  // root.finishedWork = finishedWork;

  // // 提交
  // commitRoot(root);

  // workInProgressRoot = null;
}

// 开始构建fiber树
function renderRootSync(root, renderLanes) {
  //如果新的根和老的根不一样，或者新的渲染优先级和老的渲染优先级不一样
  if (
    root !== workInProgressRoot ||
    workInProgressRootRenderLanes !== renderLanes
  ) {
    prepareFreshStack(root, renderLanes);
  }
  workLoopSync();
  return RootCompleted;
}

function renderRootConcurrent(root, lanes) {
  //因为在构建fiber树的过程中，此方法会反复进入，会进入多次
  //只有在第一次进来的时候会创建新的fiber树，或者说新fiber
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }
  //在当前分配的时间片(5ms)内执行fiber树的构建或者说渲染，
  workLoopConcurrent();
  //如果 workInProgress不为null，说明fiber树的构建还没有完成
  if (workInProgress !== null) {
    return RootInProgress;
  }
  //如果workInProgress是null了说明渲染工作完全结束了
  return workInProgressRootExitStatus;
}

// 创建一个新栈
function prepareFreshStack(root, renderLanes) {
  // 创建根节点的新fiber
  workInProgress = createWorkInProgress(root.current, null);

  // 把新的渲染优先级 赋值给 workInProgressRootRenderLanes
  workInProgressRootRenderLanes = renderLanes;

  // 当前正在调度的跟节点 就是 根节点 div #root
  workInProgressRoot = root;

  finishQueueingConcurrentUpdates(); // 在工作循环之前完成更新队列的收集
}

// 工作循环同步
function workLoopSync() {
  while (workInProgress !== null) {
    // 执行工作单元
    performUnitOfWork(workInProgress);
  }
}

function workLoopConcurrent() {
  //如果有下一个要构建的fiber并且时间片没有过期
  while (workInProgress !== null && !shouldYield()) {
    //console.log('shouldYield()', shouldYield(), workInProgress);
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // 获取新的fiber对应的老fiber
  const current = unitOfWork.alternate;
  // 完成当前fiber的子fiber链表构建后
  // debugger;
  const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes);
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
  //如果走到了这里，说明整个fiber树全部构建完毕,把构建状态设置为完成
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}

// 请求一个更新的车道
export function requestUpdateLane() {
  // 更新车道
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLanes) {
    return updateLane;
  }
  // 获取事件优先级
  const eventLane = getCurrentEventPriority();
  return eventLane;
}

/******************************* 开始进入提交阶段，把新fiber 树提交到真实DOM上 ******************************/

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
  printFinishedWork(root.finishedWork);
  const previousUpdatePriority = getCurrentUpdatePriority();
  try {
    //把当前的更新优先级设置为1
    setCurrentUpdatePriority(DiscreteEventPriority);
    commitRootImpl(root);
  } finally {
    setCurrentUpdatePriority(previousUpdatePriority);
  }
}

function commitRootImpl(root) {
  // 获取新构建好的fiber树的根fiber
  const { finishedWork } = root;
  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  root.callbackNode = null;
  // 如果新的根fiber的子节点有effect的副作用 或 自身上有effect的副作用
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true; // 表示跟上有要执行的副作用
      // scheduleCallback 不会立刻执行，它会开启一个宏任务，在构建之后执行
      Scheduler_scheduleCallback(NormalSchedulerPriority, flushPassiveEffect);
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

/******************************** 副作用执行日志打印 ********************************/
function printFinishedWork(fiber) {
  const { flags, deletions } = fiber;
  if ((flags & ChildDeletion) !== NoFlags) {
    fiber.flags &= ~ChildDeletion;
    console.log(
      "子节点有删除" +
        deletions
          .map((fiber) => `${fiber.type}#${fiber.memoizedProps.id}`)
          .join(",")
    );
  }

  let child = fiber.child;

  while (child) {
    printFinishedWork(child);
    child = child.sibling;
  }

  if (fiber.flags !== NoFlags) {
    // console.log(getFlags(fiber), getTag(fiber.tag), typeof fiber.type === 'function' ? fiber.type.name : fiber.type, fiber.memoizedProps)
  }
}

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
