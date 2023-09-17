// 每种虚拟DOM都会对应自己的fiber tag类型

// 根fiber的tag类型
export const HostRoot = 3; // 容器根节点
export const HostComponent = 5; // 原生节点 div span
export const HostText = 6; // 纯文本节点
