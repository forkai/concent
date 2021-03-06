"use strict";

exports.__esModule = true;
exports["default"] = _default;

var _privConstant = require("../../support/priv-constant");

var _util = require("../../support/util");

/**
 * 提供给用户使用，从存储的打包计算结果里获取目标计算结果的容器
 * ------------------------------------------------------------------------------------
 * 触发get时，会从打包对象里获取目标计算结果，
 * 打包对象按 ${retKey} 放置在originalCuContainer里，
 * 对于refComputed，originalCuContainer 是 ctx.refComputedOri
 * 对于moduleComputed，originalCuContainer 是  concentContext.ccComputed._computedValueOri.{$module}
 */
function _default(computed, originalCuContainer) {
  var moduleComputedValue = {};
  (0, _util.okeys)(computed).forEach(function (key) {
    // 用这个对象来存其他信息, 避免get无限递归，
    originalCuContainer[key] = (0, _util.makeCuPackedValue)();
    Object.defineProperty(moduleComputedValue, key, {
      get: function get() {
        // 防止用户传入未定义的key
        var value = originalCuContainer[key] || {};
        var needCompute = value.needCompute,
            fn = value.fn,
            newState = value.newState,
            oldState = value.oldState,
            fnCtx = value.fnCtx,
            isLazy = value.isLazy,
            result = value.result;

        if (!isLazy) {
          return result;
        }

        if (isLazy && needCompute) {
          var ret = fn(newState, oldState, fnCtx);
          value.result = ret;
          value.needCompute = false;
        }

        return value.result;
      },
      set: function set(input) {
        var value = originalCuContainer[key];

        if (!input[_privConstant.CU_KEY]) {
          (0, _util.justWarning)("computed value can not been changed manually");
          return;
        }

        if (input.isLazy) {
          value.isLazy = true;
          value.needCompute = true;
          value.newState = input.newState;
          value.oldState = input.oldState;
          value.fn = input.fn;
          value.fnCtx = input.fnCtx;
        } else {
          value.isLazy = false;
          value.result = input.result;
        }
      }
    });
  });
  return moduleComputedValue;
}