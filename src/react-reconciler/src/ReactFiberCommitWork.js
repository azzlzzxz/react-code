import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
} from "./ReactWorkTags";
import {
  appendChild,
  insertBefore,
  commitUpdate,
  removeChild,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";
import {
  Update,
  Passive,
  LayoutMask,
  MutationMask,
  Placement,
  Ref,
} from "./ReactFiberFlags";
import {
  Passive as HookPassive,
  HasEffect as HookHasEffect,
  Layout as HookLayout,
} from "./ReactHookEffectTags";

let hostParent = null;
/**
 * 提交删除副作用
 * @param {*} root 根节点
 * @param {*} returnFiber 父fiber
 * @param {*} deletedFiber 删除的fiber
 */
function commitDeletionEffects(root, returnFiber, deletedFiber) {
  let parent = returnFiber;
  //一直向上找，找到真实的DOM节点为此
  findParent: while (parent !== null) {
    switch (parent.tag) {
      case HostComponent: {
        hostParent = parent.stateNode;
        break findParent;
      }
      case HostRoot: {
        hostParent = parent.stateNode.containerInfo;
        break findParent;
      }
    }
    parent = parent.return;
  }
  commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
  hostParent = null;
}

/**
 *
 * @param {*} finishedRoot 完成的根节点
 * @param {*} nearestMountedAncestor 最近的挂载的祖先
 * @param {*} deletedFiber 需要删除的fiber
 */
function commitDeletionEffectsOnFiber(
  finishedRoot,
  nearestMountedAncestor,
  deletedFiber
) {
  switch (deletedFiber.tag) {
    case HostComponent:
    case HostText: {
      //当要删除一个节点的时候，要先删除它的子节点
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      //再把自己删除
      if (hostParent !== null) {
        removeChild(hostParent, deletedFiber.stateNode);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * 遍历执行子节点的删除
 * @param {*} finishedRoot
 * @param {*} nearestMountedAncestor
 * @param {*} parent
 */
function recursivelyTraverseDeletionEffects(
  finishedRoot,
  nearestMountedAncestor,
  parent
) {
  let child = parent.child;
  while (child !== null) {
    commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, child);
    child = child.sibling;
  }
}

/**
 * 递归遍历处理变更的副作用
 * @param {*} root 根节点
 * @param {*} parentFiber 父fiber
 */
function recursivelyTraverseMutationEffects(root, parentFiber) {
  //先把父fiber上该删除的节点都删除
  const deletions = parentFiber.deletions;
  if (deletions !== null) {
    for (let i = 0; i < deletions.length; i++) {
      const childToDelete = deletions[i];
      commitDeletionEffects(root, parentFiber, childToDelete);
    }
  }
  // 如果parentFiber父fiber有收集合并的副作用，那就处理递归处理子节点的副作用
  if (parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber;
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root);
      child = child.sibling;
    }
  }
}

// 处理自己身上的副作用
function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork;
  //如果此fiber要执行插入操作的话
  if (flags & Placement) {
    //进行插入操作，也就是把此fiber对应的真实DOM节点添加到父真实DOM节点上
    commitPlacement(finishedWork);
    //把flags里的Placement删除
    finishedWork.flags & ~Placement;
  }
}

function isHostParent(fiber) {
  // fiber的tag是原生节点类型或者是容器根节点
  return fiber.tag === HostComponent || fiber.tag == HostRoot; //div#root
}

function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
  parent;
}

/**
 * 把子节点对应的真实DOM插入到父节点DOM中
 * @param {*} node 将要插入的fiber节点
 * @param {*} parent 父真实DOM节点
 */
function insertOrAppendPlacementNode(node, before, parent) {
  const { tag } = node;
  //判断此fiber对应的节点是不是真实DOM节点
  const isHost = tag === HostComponent || tag === HostText;
  //如果是的话直接插入
  if (isHost) {
    const { stateNode } = node;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }
  } else {
    //如果node不是真实的DOM节点，获取它的第一个子节点
    const { child } = node;
    if (child !== null) {
      //把第一个子节点添加到父亲DOM节点里面去
      insertOrAppendPlacementNode(child, before, parent);
      let { sibling } = child;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

/**
 * 找到要插入的锚点
 * 找到可以插在它的前面的那个fiber对应的真实DOM
 * @param {*} fiber
 */
function getHostSibling(fiber) {
  let node = fiber;
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    node = node.sibling;
    //如果弟弟不是原生节点也不是文本节点
    while (node.tag !== HostComponent && node.tag !== HostText) {
      //如果此节点是一个将要插入的新的节点，找它的弟弟
      if (node.flags & Placement) {
        continue siblings;
      } else {
        node = node.child;
      }
    }
    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

/**
 * 把此fiber的真实DOM插入到父DOM里
 * @param {*} finishedWork
 */
function commitPlacement(finishedWork) {
  // console.log('commitPlacement', finishedWork)

  // 找父fiber
  const parentFiber = getHostParentFiber(finishedWork);

  switch (parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo; // 根fiber的真实DOM元素（div #root）

      const before = getHostSibling(finishedWork);

      insertOrAppendPlacementNode(finishedWork, before, parent);

      break;
    }
    case HostComponent: {
      const parent = parentFiber.stateNode; // 原生fiber类型，通过stateNode找到原生DOM元素
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    default:
      break;
  }
}

// 给fiber的ref赋予真实DOM
function commitAttachRef(finishedWork) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;
    if (typeof ref === "function") {
      ref(instance);
    } else {
      ref.current = instance;
    }
  }
}

/**
 * 遍历fiber树，执行fiber上的副作用 变更DOM操作
 * @param {*} finishedWork fiber节点
 * @param {*} root 根节点
 */
export function commitMutationEffectsOnFiber(finishedWork, root) {
  const current = finishedWork.alternate; // 当前fiber的老fiber
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent: {
      //先遍历它们的子节点，处理它们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork);
      //再处理自己身上的副作用
      commitReconciliationEffects(finishedWork);

      if (flags & Update) {
        commitHookEffectListUnmount(HookHasEffect | HookLayout, finishedWork);
      }
      break;
    }
    case HostRoot:
    case HostText: {
      //先遍历它们的子节点，处理它们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork);
      //再处理自己身上的副作用
      commitReconciliationEffects(finishedWork);
      break;
    }
    case HostComponent: {
      //先遍历它们的子节点，处理它们的子节点上的副作用
      recursivelyTraverseMutationEffects(root, finishedWork);
      //再处理自己身上的副作用

      commitReconciliationEffects(finishedWork);
      if (flags & Ref) {
        commitAttachRef(finishedWork);
      }
      //处理DOM更新
      if (flags & Update) {
        //获取真实DOM
        const instance = finishedWork.stateNode;
        //更新真实DOM
        if (instance !== null) {
          const newProps = finishedWork.memoizedProps;
          const oldProps = current !== null ? current.memoizedProps : newProps;
          const type = finishedWork.type;
          // 原生组件的更新队列里放的是带生效的属性
          const updatePayload = finishedWork.updateQueue;
          finishedWork.updateQueue = null;
          if (updatePayload) {
            commitUpdate(
              instance,
              updatePayload,
              type,
              oldProps,
              newProps,
              finishedWork
            );
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

/************************************ 先执行 提交 unmount(destroy)阶段的 effect 副作用 useEffect 的实现 *************************************/

export function commitPassiveUnmountEffects(finishedWork) {
  commitPassiveUnmountOnFiber(finishedWork);
}

function commitPassiveUnmountOnFiber(finishedWork) {
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    }
    case FunctionComponent: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      if (flags & Passive) {
        //1024
        commitHookPassiveUnmountEffects(
          finishedWork,
          HookHasEffect | HookPassive
        );
      }
      break;
    }
  }
}

function recursivelyTraversePassiveUnmountEffects(parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveUnmountOnFiber(child);
      child = child.sibling;
    }
  }
}

function commitHookPassiveUnmountEffects(finishedWork, hookFlags) {
  commitHookEffectListUnmount(hookFlags, finishedWork);
}

function commitHookEffectListUnmount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    //获取 第一个effect
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      //如果此 effect类型和传入的相同，都是 9 HookHasEffect | PassiveEffect
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy;
        if (destroy !== undefined) {
          destroy();
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

/************************************ 再执行 提交 mount阶段的 effect 副作用 useEffect 的实现*************************************/

/**
 *
 * @param {*} root 根节点
 * @param {*} finishedWork 新根fiber
 */
export function commitPassiveMountEffects(root, finishedWork) {
  commitPassiveMountOnFiber(root, finishedWork);
}

// 递归处理新fiber树上的 effect
function commitPassiveMountOnFiber(finishedRoot, finishedWork) {
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      break;
    }
    case FunctionComponent: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      if (flags & Passive) {
        //1024
        commitHookPassiveMountEffects(
          finishedWork,
          HookHasEffect | HookPassive
        );
      }
      break;
    }
  }
}

// 深度优先的递归遍历
function recursivelyTraversePassiveMountEffects(root, parentFiber) {
  // 检查父fiber的子树是否包含副作用
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    // 遍历父fiber的所有子fiber
    while (child !== null) {
      // 每个子fiber上都执行commitPassiveMountOnFiber
      commitPassiveMountOnFiber(root, child);
      // 移动到下一个子fiber
      child = child.sibling;
    }
  }
}

// 提交hook上的挂载副作用（effect）
function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork);
}
// 从第一个开始 执行循环链表中的所有effect
function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    // lastEffect不为null，至少有一个effect要执行
    //获取 第一个effect
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      //如果此 effect类型和传入的相同，都是 9 HookHasEffect | PassiveEffect
      if ((effect.tag & flags) === flags) {
        const create = effect.create;
        effect.destroy = create(); // 执行create方法，把结果给destroy
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

/********************************** useLayoutEffect 在提交阶段执行 *******************************/

export function commitLayoutEffects(finishedWork, root) {
  //老的根fiber
  const current = finishedWork.alternate;
  commitLayoutEffectOnFiber(root, current, finishedWork);
}
function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    }
    case FunctionComponent: {
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (flags & LayoutMask) {
        // LayoutMask=Update=4
        commitHookLayoutEffects(finishedWork, HookHasEffect | HookLayout);
      }
      break;
    }
  }
}
function commitHookLayoutEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork);
}
function recursivelyTraverseLayoutEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child;
    while (child !== null) {
      const current = child.alternate;
      commitLayoutEffectOnFiber(root, current, child);
      child = child.sibling;
    }
  }
}
