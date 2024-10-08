import { allowConcurrentByDefault } from "shared/ReactFeatureFlags";

export const TotalLanes = 31;
export const NoLanes = 0b0000000000000000000000000000000;
export const NoLane = 0b0000000000000000000000000000000;
export const SyncLane = 0b0000000000000000000000000000001;
export const InputContinuousHydrationLane = 0b0000000000000000000000000000010;
export const InputContinuousLane = 0b0000000000000000000000000000100;
export const DefaultHydrationLane = 0b0000000000000000000000000001000;
export const DefaultLane = 0b0000000000000000000000000010000;
export const SelectiveHydrationLane = 0b0001000000000000000000000000000;
export const IdleHydrationLane = 0b0010000000000000000000000000000;
export const IdleLane = 0b0100000000000000000000000000000;
export const OffscreenLane = 0b1000000000000000000000000000000;

const NonIdleLanes = 0b0001111111111111111111111111111;

// 没有时间戳
export const NoTimestamp = -1;

// 标记当前根节点上等待更新的lane
export function markRootUpdated(root, updateLane) {
  //pendingLanes指的此根上等待生效的lane
  root.pendingLanes |= updateLane;
}

// 获取当前根节点上等待更新的所有赛道中，优先级最高的赛道
export function getNextLanes(root, wipLanes) {
  //先获取所有的有更新的赛道
  const pendingLanes = root.pendingLanes;
  if (pendingLanes == NoLanes) {
    return NoLanes;
  }

  // 获取所有的赛道中最高优先级的赛道
  const nextLanes = getHighestPriorityLanes(pendingLanes);

  if (wipLanes !== NoLane && wipLanes !== nextLanes) {
    // 新的赛道值比渲染中的车道大，说明新的赛道优先级更低
    if (nextLanes > wipLanes) {
      return wipLanes;
    }
  }

  return nextLanes;
}

export function getHighestPriorityLanes(lanes) {
  return getHighestPriorityLane(lanes);
}

//找到最右边的1 只能返回一个赛道
export function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}

// 判断是否有非空闲工作
export function includesNonIdleWork(lanes) {
  return (lanes & NonIdleLanes) !== NoLanes;
}

export function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset;
}
export function mergeLanes(a, b) {
  return a | b;
}

export function includesBlockingLane(root, lanes) {
  //如果允许默认并行渲染
  if (allowConcurrentByDefault) {
    return false;
  }

  // 同步默认车道
  const SyncDefaultLanes = InputContinuousLane | DefaultLane;
  return (lanes & SyncDefaultLanes) !== NoLane;
}

// 取是左侧的1的索引
function pickArbitraryLaneIndex(lanes) {
  // clz32返回最左侧的1的左边0的个数
  return 31 - Math.clz32(lanes);
}

// 把饿死的赛道标识为过期
export function markStarvedLanesAsExpired(root, currentTime) {
  //获取当前有更新赛道
  const pendingLanes = root.pendingLanes;
  //记录每个赛道上的过期时间
  const expirationTimes = root.expirationTimes;
  let lanes = pendingLanes;
  while (lanes > 0) {
    //获取最左侧的1的索引
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    // 获取这个索引上的过期时间
    const expirationTime = expirationTimes[index];
    //如果此赛道上没有过期时间,说明没有为此车道设置过期时间
    if (expirationTime === NoTimestamp) {
      expirationTimes[index] = computeExpirationTime(lane, currentTime);
      //如果此车道的过期时间已经小于等于当前时间了
    } else if (expirationTime <= currentTime) {
      //把此车道添加到过期车道里
      root.expiredLanes |= lane;
      console.log(
        "expirationTime",
        expirationTime,
        "currentTime",
        currentTime,
        root.expiredLanes
      );
    }
    lanes &= ~lane;
  }
}
function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case SyncLane:
    case InputContinuousLane:
      return currentTime + 250;
    case DefaultLane:
      return currentTime + 5000;
    case IdleLane:
      return NoTimestamp;
    default:
      return NoTimestamp;
  }
}

export function createLaneMap(initial) {
  const laneMap = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}
export function includesExpiredLane(root, lanes) {
  return (lanes & root.expiredLanes) !== NoLanes;
}
export function markRootFinished(root, remainingLanes) {
  // pendingLanes根上所有的将要被渲染的车道 1和16
  // remainingLanes 16
  // noLongerPendingLanes指的是已经更新过的lane
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;
  root.pendingLanes = remainingLanes;
  const expirationTimes = root.expirationTimes;
  let lanes = noLongerPendingLanes;
  while (lanes > 0) {
    //获取最左侧的1的索引
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    //清除已经计算过的车道的过期时间
    expirationTimes[index] = NoTimestamp;
    lanes &= ~lane;
  }
}
