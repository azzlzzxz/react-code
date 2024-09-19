const randomKey = Math.random().toString(36).slice(2);
const internalInstanceKey = '__reactFiber$' + randomKey;
const internalPropsKey = "__reactProps$" + randomKey;

/**
 * 提前缓存fiber节点的实例到DOM节点上
 * @param {*} hostInst fiber实例
 * @param {*} node 真实DOM
 */
export function precacheFiberNode(hostInst, node) {
    node[internalInstanceKey] = hostInst;
}

export function updateFiberProps(node, props) {
    node[internalPropsKey] = props;
}