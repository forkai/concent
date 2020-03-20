import * as util from '../../support/util';
import ccContext from '../../cc-context';
import * as cache from './_cache';

const { okeys } = util;
const { ccUKey_ref_, waKey_uKeyMap_, waKey_staticUKeyMap_ } = ccContext;

export default function (moduleName, partialSharedState, renderKey, renderKeyClasses) {

  const sharedStateKeys = okeys(partialSharedState);
  const cacheKey = cache.getCacheKey(moduleName, sharedStateKeys, renderKey, renderKeyClasses);
  const cachedResult = cache.getCache(moduleName, cacheKey);
  if (cachedResult) {
    return { sharedStateKeys, result: cachedResult };
  }

  const targetUKeyMap = {};
  const belongRefKeys = [];
  const connectRefKeys = [];

  sharedStateKeys.forEach(stateKey => {
    const waKey = `${moduleName}/${stateKey}`;
    // 利用assign不停的去重
    Object.assign(targetUKeyMap, waKey_uKeyMap_[waKey], waKey_staticUKeyMap_[waKey]);
  });
  const uKeys = okeys(targetUKeyMap);

  const putRef = (isBelong, ccUniqueKey) => {
    isBelong ? belongRefKeys.push(ccUniqueKey) : connectRefKeys.push(ccUniqueKey);
  }

  const tryMatch = (ref, toBelong) => {
    const {
      renderKey: refRenderKey, ccClassKey: refCcClassKey, ccUniqueKey,
    } = ref.ctx;

    // 如果调用方携带renderKey发起修改状态动作，则需要匹配renderKey做更新
    if (renderKey) {
      const isRenderKeyMatched = refRenderKey === renderKey;

      // 所有的类实例都受renderKey匹配机制影响
      if (renderKeyClasses === '*') {
        if (isRenderKeyMatched) {
          putRef(toBelong, ccUniqueKey);
        }
      }
      else {
        // 这些指定类实例受renderKey机制影响
        if (renderKeyClasses.includes(refCcClassKey)) {
          if (isRenderKeyMatched) {
            putRef(toBelong, ccUniqueKey);
          }
        }
        // 这些实例则不受renderKey机制影响
        else {
          putRef(toBelong, ccUniqueKey);
        }
      }
    } else {
      putRef(toBelong, ccUniqueKey);
    }

  }

  let missRef = false;
  uKeys.forEach(key => {
    const ref = ccUKey_ref_[key];
    if (!ref) {
      missRef = true;
      return;
    }

    const refCtx = ref.ctx;
    const {
      module: refModule, connect: refConnect,
    } = refCtx;
    const isBelong = refModule === moduleName;
    const isConnect = refConnect[moduleName] ? true : false;

    if (isBelong) {
      tryMatch(ref, true);
    }
    // 一个实例如果既属于模块x同时也连接了模块x，这是不推荐的，在buildCtx里面已给出警告
    // 会造成冗余的渲染
    if (isConnect) {
      tryMatch(ref, false);
    }
  });

  const result = {
    belong: belongRefKeys,
    connect: connectRefKeys,
  };

  // 没有miss的ref才存缓存，防止直接标记了watchedKeys的实例此时还没有记录ref，
  // 但是此时刚好有变更状态的命令的话，如果这里缓存了查询结果，这这个实例挂上后，没有机会响应状态变更了
  if (!missRef) {
    cache.setCache(moduleName, cacheKey, result);
  }

  return { sharedStateKeys, result };
}