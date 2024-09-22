import hasOwnProperty from "shared/hasOwnProperty";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";

const RESERVED_PROPS = {
  // 保留的属性,不会放到props上
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

function hasVaidRef(config) {
  return config.ref !== undefined;
}

function ReactElement(type, key, ref, props) {
  // 这就是React元素，也被称为React节点或者虚拟DOM
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type, // h1 span dom类型
    key, // 唯一标识
    ref, // 是用来获取真实DOM的
    props, // 属性 例如：className、style、children、id等
  };
}

//React17以前老版的转换函数中key 是放在config里的,第三个参数放children
//React17之后新版的转换函数中key是在第三个参数中的，children是放在config里的
export function jsxDEV(type, config, maybeKey) {
  let propName; // 属性名
  const props = {}; // 属性对象
  let key = null; // 每个虚拟DOM都有一个可选的key属性，用来区分一个父节点下的不同子节点
  let ref = null; // 引入，后面可以通过它实现获取真实DOM的操作

  if (typeof maybeKey !== 'undefined') {
    key = maybeKey;
  }

  if (hasVaidRef(config)) {
    // 判断是否有ref属性
    ref = config.ref;
  }

  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  return ReactElement(type, key, ref, props);
}
