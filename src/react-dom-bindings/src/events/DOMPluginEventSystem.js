import { allNativeEvents } from './EventRegistry';
import * as SimpleEventPlugin from './plugins/SimpleEventPlugin';
import { IS_CAPTURE_PHASE } from './EventSystemFlags';
import { createEventListenerWrapperWithPriority } from './ReactDOMEventListener';
import {
    addEventCaptureListener,
    addEventBubbleListener
  } from './EventListener';
  import getEventTarget from './getEventTarget';
import getListener from './getListener';
import { HostComponent } from 'react-reconciler/src/ReactWorkTags';

SimpleEventPlugin.registerEvents();

const listeningMarker = `_reactListening` + Math.random().toString(36).slice(2);

export function listenToAllSupportedEvents(rootContainerElement) {
    // 根容器监听，也就是div#root只监听一次
    if (!rootContainerElement[listeningMarker]) {
      rootContainerElement[listeningMarker] = true;
      // 遍历所有的原生的事件比如click,进行监听
      allNativeEvents.forEach((domEventName) => {
        listenToNativeEvent(domEventName, true, rootContainerElement);
        listenToNativeEvent(domEventName, false, rootContainerElement);
      });
    }
}

/**
 * 注册原生事件
 * @param {*} domEventName 原生事件 click
 * @param {*} isCapturePhaseListener 是否是捕获阶段 true false
 * @param {*} target 目标DOM节点 也就是 div#root 容器节点
 */
export function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
    let eventSystemFlags = 0;// 默认是 0 指的是冒泡  4 是捕获
    if (isCapturePhaseListener) {
      eventSystemFlags |= IS_CAPTURE_PHASE;
    }
    addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener);
}

/**
 * 
 * @param {*} targetContainer 目标容器
 * @param {*} domEventName dom事件名
 * @param {*} eventSystemFlags 事件标识
 * @param {*} isCapturePhaseListener 是否是捕获
 */
function addTrappedEventListener(
    targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener
) {
    // 监听函数
    const listener = createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags);
    if (isCapturePhaseListener) {
      // 增加事件捕获监听
      addEventCaptureListener(targetContainer, domEventName, listener);
    } else {
      // 增加事件冒泡监听
      addEventBubbleListener(targetContainer, domEventName, listener);
    }
}

export function dispatchEventForPluginEventSystem(
    domEventName, eventSystemFlags, nativeEvent, targetInst, targetContainer
  ) {
    dispatchEventForPlugins(domEventName, eventSystemFlags, nativeEvent, targetInst, targetContainer)
}
  
function dispatchEventForPlugins(domEventName, eventSystemFlags, nativeEvent, targetInst, targetContainer) {
    const nativeEventTarget = getEventTarget(nativeEvent);
    //派发事件的数组
    const dispatchQueue = [];
    // 提取事件
    extractEvents(
      dispatchQueue,
      domEventName,
      targetInst,
      nativeEvent,
      nativeEventTarget,
      eventSystemFlags,
      targetContainer
    );
}

function extractEvents(dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer) {
    SimpleEventPlugin.extractEvents(
      dispatchQueue,
      domEventName,
      targetInst,
      nativeEvent,
      nativeEventTarget,
      eventSystemFlags,
      targetContainer
    );
}

// 累加单阶段监听
export function accumulateSinglePhaseListeners(
    targetFiber, reactName, nativeEventType, isCapturePhase
  ) {
    const captureName = reactName + 'Capture';
    const reactEventName = isCapturePhase ? captureName : reactName;
    const listeners = [];
    let instance = targetFiber;
    while (instance !== null) {
      const { stateNode, tag } = instance;//stateNode 当前的执行回调的DOM节点
      if (tag === HostComponent && stateNode !== null) {
        const listener = getListener(instance, reactEventName);
        console.log('listener', listener)
        if (listener) {
          listeners.push();
        }
      }
      instance = instance.return;
    }
    return listeners;
}