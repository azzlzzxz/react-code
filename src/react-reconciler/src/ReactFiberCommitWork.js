import { MutationMask, Placement } from './ReactFiberFlags'
import { HostRoot, HostComponent, HostText, FunctionComponent } from './ReactWorkTags';
import { appendChild, insertBefore, commitUpdate } from 'react-dom-bindings/src/client/ReactDOMHostConfig';
import { Update } from './ReactFiberFlags';

/**
 * 递归遍历处理变更的副作用
 * @param {*} root 根节点
 * @param {*} parentFiber 父fiber
 */
function recursivelyTraverseMutationEffects(root, parentFiber) {
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
    return fiber.tag === HostComponent || fiber.tag == HostRoot;//div#root
  }

function getHostParentFiber(fiber) {
    let parent = fiber.return;
    while (parent !== null) {
      if (isHostParent(parent)) {
        return parent;
      }
      parent = parent.return;
    }
    parent
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
        insertOrAppendPlacementNode(child, before, parent)
        let { sibling } = child;
        while (sibling !== null) {
          insertOrAppendPlacementNode(sibling, before, parent)
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

/**
 * 遍历fiber树，执行fiber上的副作用 变更操作
 * @param {*} finishedWork fiber节点
 * @param {*} root 根节点
 */
export function commitMutationEffectsOnFiber (finishedWork, root) {
  const current = finishedWork.alternate;// 当前fiber的老fiber
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
      case FunctionComponent:
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
        //处理DOM更新
        if (flags & Update) {
          //获取真实DOM
          const instance = finishedWork.stateNode;
          //更新真实DOM
          if (instance !== null) {
            const newProps = finishedWork.memoizedProps;
            const oldProps = current !== null ? current.memoizedProps : newProps;
            const type = finishedWork.type;
            console.log('oldProps',oldProps)
            console.log('newProps',newProps)
            // 原生组件的更新队列里放的是带生效的属性
            const updatePayload = finishedWork.updateQueue;
            console.log('updatePayload',updatePayload)
            finishedWork.updateQueue = null;
            if (updatePayload) {
              commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork);
            }
          }
        }
        break;
      }
      default:
        break;
  }
}