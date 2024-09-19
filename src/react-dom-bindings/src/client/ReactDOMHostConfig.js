import { precacheFiberNode, updateFiberProps } from './ReactDOMComponentTree';
import { setInitialProperties } from './ReactDOMComponent';
export function shouldSetTextContent(type, props) {
    return typeof props.children === "string" || typeof props.children === "number";
}

export function createTextInstance(content) {
    return document.createTextNode(content);
}

/**
 * 在原生组件初次挂载的时候，会通过此方法创建真实DOM
 * @param {*} type 类型 span
 * @param {*} props 属性
 * @param {*} internalInstanceHandle 它对应的fiber
 * @returns 
 */
export function createInstance(type, props, internalInstanceHandle) {
    const domElement = document.createElement(type);
    //预先缓存fiber节点到DOM元素上
    precacheFiberNode(internalInstanceHandle, domElement);
    //把属性直接保存在domElement的属性上
    updateFiberProps(domElement, props);
    return domElement;
}

export function appendInitialChild(parent, child) {
    parent.appendChild(child);
}

export function finalizeInitialChildren(domElement, type, props) {
    // 设置初始属性
    setInitialProperties(domElement, type, props);
}

export function appendChild(parentInstance, child) {
    parentInstance.appendChild(child);
}

/**
 * 
 * @param {*} parentInstance 父DOM节点
 * @param {*} child 子DOM节点
 * @param {*} beforeChild 插入到谁的前面，它也是一个DOM节点
 */
export function insertBefore(parentInstance, child, beforeChild) {
    parentInstance.insertBefore(child, beforeChild);
}