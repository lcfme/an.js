
  ;(function(f) {
    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = f(require('pixi.js'));
  
    // RequireJS
    } else if (typeof define === "function" && define.amd) {
      define(['pixi.js'], f);
  
    // <script>
    } else {
      var g;
      if (typeof window !== "undefined") {
        g = window;
      } else if (typeof global !== "undefined") {
        g = global;
      } else if (typeof self !== "undefined") {
        g = self;
      } else {
        // works providing we're not in "use strict";
        // needed for Java 8 Nashorn
        g = this;
      }
      g.An = f(g.PIXI);
    }
  })(function(PIXI) {
    if (!PIXI) {
      throw new Error('An.js requires pixi.js as peer dependency.');
    }
    return (function(f){return f()})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

var updator = require("./updator");

function Component(props) {
  this.props = props;
}

Component.prototype.An = {};

Component.prototype.setState = function (o) {
  this.state = Object.assign({}, this.state, o);
  updator.update(this);
};

module.exports = Component;

},{"./updator":13}],2:[function(require,module,exports){
"use strict";

var lifycycle = require("./lifycycle");

var counter = 0;

function CompositeComponent(element) {
  this.currentElement = element;
  this.publicInstance = null;
  this.renderedComponent = null;
  this._id = counter++;
}

CompositeComponent.prototype.mount = function () {
  var element = this.currentElement;
  var props = element.props;
  var type = element.type;
  var publicInstance = new type(props);
  publicInstance.props = props;
  publicInstance.__instance__ = this;
  this.publicInstance = publicInstance;

  if (publicInstance.beforeMount) {
    publicInstance.beforeMount();
  }

  var renderedElement = publicInstance.render();
  var renderedComponent = this.instantiateComponent(renderedElement);
  this.renderedComponent = renderedComponent;
  var pixiObj = renderedComponent.mount();

  if (publicInstance.mounted) {
    lifycycle.mounted.enqueue(publicInstance.mounted.bind(publicInstance));
  }

  return pixiObj;
};

CompositeComponent.prototype.getPixiObj = function () {
  return this.renderedComponent.getPixiObj() || null;
};

CompositeComponent.prototype.receive = function (element) {
  var prevElement = this.currentElement;
  var prevProps = prevElement.props;
  var prevType = prevElement.type;
  var publicInstance = this.publicInstance;
  var prevRenderedComponent = this.renderedComponent;

  if (prevType !== element.type) {
    this.unmount();
    this._dirty = false;
    return;
  }

  if (publicInstance.beforeUpdate) {
    publicInstance.beforeUpdate();
  }

  var props = element.props;
  publicInstance.props = props;
  var nextRenderedElement = publicInstance.render();

  if (nextRenderedElement.type !== prevRenderedComponent.currentElement.type) {
    var prevRenderedComponentPixiObj = prevRenderedComponent.getPixiObj();
    var prevRenderedComponentPixiObjParent = prevRenderedComponentPixiObj.parent;
    prevRenderedComponent.unmount();

    if (prevRenderedComponentPixiObjParent) {
      prevRenderedComponentPixiObjParent.removeChild(prevRenderedComponentPixiObj);
    }

    var nextRenderedComponent = this.instantiateComponent(nextRenderedElement);
    var nextRenderedComponentPixiObj = nextRenderedComponent.mount();
    prevRenderedComponentPixiObjParent.addChild(nextRenderedComponentPixiObj);
    this.renderedComponent = nextRenderedComponent;

    if (publicInstance.updated) {
      publicInstance.updated();
    }

    this._dirty = false;
    return;
  }

  prevRenderedComponent.receive(nextRenderedElement);

  if (publicInstance.updated) {
    publicInstance.updated();
  }

  this._dirty = false;
};

CompositeComponent.prototype.unmount = function () {
  var publicInstance = this.publicInstance;
  var renderedComponent = this.renderedComponent;

  if (publicInstance.willUnmount) {
    publicInstance.willUnmount();
  }

  renderedComponent.unmount();
};

module.exports = CompositeComponent;

},{"./lifycycle":9}],3:[function(require,module,exports){
"use strict";

function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var forEachProps = require("./forEachProps");

function NativeComponent(element) {
  this.currentElement = element;
  this.pixiObj = null;
  this.renderedChildren = null;
  this._listeners = null;
}

NativeComponent.prototype.mount = function () {
  var element = this.currentElement;
  var type = element.type;
  var props = element.props;
  var children = props.children;
  var initialize = props.initialize ? props.initialize.slice() : [];
  var pixiObj;

  if (props.noNew) {
    pixiObj = type.apply(null, initialize);
  } else {
    pixiObj = _construct(type, initialize);
  }

  for (var i = props.length; i--;) {
    var prop = props[i];

    if (/^on([\S\S]+)/.test(prop)) {
      var listenerName = prop.match(/^on([\S\S]+)/)[1];
      var listenerFn = props[prop];
      pixiObj.on(listenerName, listenerFn);
      (this._listeners || (this._listeners = [])).push([listenerName, listenerFn]);
    }
  }

  forEachProps(props, function (k, v) {
    pixiObj[k] = v;
  });
  this.pixiObj = pixiObj;

  if (children && children.length) {
    var renderedChildren = [];

    for (var _i = 0, l = children.length; _i < l; _i++) {
      var child = this.instantiateComponent(children[_i]);
      var childPixiObj = child.mount();
      pixiObj.addChild(childPixiObj);
      renderedChildren.push(child);
    }

    this.renderedChildren = renderedChildren;
  }

  return pixiObj;
};

NativeComponent.prototype.receive = function (element) {
  var prevElement = this.currentElement;
  var prevType = prevElement.type;
  var prevProps = prevElement.props;
  var type = element.type;
  this.currentElement = element;

  if (prevProps.initialize || prevType !== type) {
    this.unmount();
  } else {
    this.update();
  }
};

NativeComponent.prototype.update = function () {
  var element = this.currentElement;
  var props = element.props;
  var children = props.children || [];
  var pixiObj = this.pixiObj;
  var prevRenderedChildren = this.renderedChildren || [];
  forEachProps(props, function (k, v) {
    pixiObj[k] = v;
  });
  var nextRenderedChildren = [];

  for (var i = 0; i < children.length; i++) {
    var nextChildElement = children[i];
    var prevChild = prevRenderedChildren[i];

    if (!prevChild) {
      var nextChild = this.instantiateComponent(nextChildElement);
      var nextPixiObj = nextChild.mount();
      nextRenderedChildren.push(nextChild);
      pixiObj.addChild(nextPixiObj);
      continue;
    }

    var shoudUseUpdate = !nextChildElement.props.initialize && prevChild.currentElement.type === nextChildElement.type;

    if (!shoudUseUpdate) {
      var prevChildPixiObj = prevChild.getPixiObj();
      prevChild.unmount();

      if (prevChildPixiObj.parent) {
        prevChildPixiObj.parent.removeChild(prevChildPixiObj);
      }

      var _nextChild = this.instantiateComponent(nextChildElement);

      var nextChildPixiObj = _nextChild.mount();

      nextRenderedChildren.push(_nextChild);
      pixiObj.addChild(nextChildPixiObj);
      continue;
    }

    prevChild.receive(nextChildElement);
    nextRenderedChildren.push(prevChild);
  }

  for (var j = nextRenderedChildren.length; j < prevRenderedChildren.length; j++) {
    var _prevChild = prevRenderedChildren[j];

    var _prevChildPixiObj = _prevChild.getPixiObj();

    _prevChild.unmount();

    if (_prevChildPixiObj.parent) {
      _prevChildPixiObj.parent.removeChild(_prevChildPixiObj);
    }
  }

  this.renderedChildren = nextRenderedChildren;
};

NativeComponent.prototype.getPixiObj = function () {
  return this.pixiObj || null;
};

NativeComponent.prototype.unmount = function () {
  if (this._listeners && this._listeners.length) {
    for (var i = this._listeners.length; i--;) {
      this.pixiObj.off(this._listeners[i][0], this._listeners[i][1]);
    }
  }

  this.pixiObj.destroy();
};

module.exports = NativeComponent;

},{"./forEachProps":7}],4:[function(require,module,exports){
"use strict";

var PIXI = require('./pixijsUMDShim.js');

exports.createElement = require("./createElement");
exports.Component = require("./Component");
exports.render = require("./render");

require("./pixiInjection").inject(PIXI);

},{"./Component":1,"./createElement":6,"./pixiInjection":10,"./pixijsUMDShim.js":11,"./render":12}],5:[function(require,module,exports){
"use strict";

function CallbackQueue() {
  var arr = null;

  function reset() {
    (arr = arr || []).length = 0;
  }

  function _flush(i) {
    var errThown;
    arr = arr ? arr.slice() : [];

    try {
      errThown = true;

      for (i !== undefined ? i : 0; i < arr.length; i++) {
        var item = arr[i];
        var fn = item[0];
        var ctx = item[1];
        var args = item[2];
        fn.apply(ctx, args);
      }

      errThown = false;
    } finally {
      if (errThown) {
        _flush(i + 1);
      } else {
        reset();
      }
    }
  }

  return {
    reset: reset,
    enqueue: function enqueue(fn, context) {
      var args = [].slice.call(arguments, 2);
      arr = arr || [];
      arr.push([fn, context, args]);
    },
    flush: function flush() {
      _flush(0);
    }
  };
}

exports = module.exports = CallbackQueue;

},{}],6:[function(require,module,exports){
"use strict";

function createElement(type, props) {
  props = Object.assign({}, props);

  if (arguments.length > 2) {
    var children = [].slice.call(arguments, 2);
    props.children = children;
  }

  return {
    type: type,
    props: props,
    $$typeof: "An"
  };
}

module.exports = createElement;

},{}],7:[function(require,module,exports){
"use strict";

function forEachProps(props, cb) {
  var keys = Object.keys(props);

  for (var i = keys.length; i--;) {
    var key = keys[i];

    if (key === "children" || key === "initialize" || /^on/.test(key)) {
      continue;
    }

    var prop = props[key];
    cb(key, prop);
  }
}

module.exports = forEachProps;

},{}],8:[function(require,module,exports){
"use strict";

var CompositeComponent = require("./CompositeComponent");

var NativeComponent = require("./NativeComponent");

var Component = require("./Component");

CompositeComponent.prototype.instantiateComponent = instantiateComponent;
NativeComponent.prototype.instantiateComponent = instantiateComponent;

function instantiateComponent(element) {
  if (element.type.prototype.An === Component.prototype.An) {
    return new CompositeComponent(element);
  } else {
    return new NativeComponent(element);
  }
}

module.exports = instantiateComponent;

},{"./Component":1,"./CompositeComponent":2,"./NativeComponent":3}],9:[function(require,module,exports){
"use strict";

var Cbq = require("./cbq");

module.exports = {
  mounted: Cbq()
};

},{"./cbq":5}],10:[function(require,module,exports){
"use strict";

var pixi = null;

exports.inject = function inject(_pixi) {
  pixi = _pixi;
};

exports.getPixi = function getPixi() {
  return pixi;
};

},{}],11:[function(require,module,exports){
"use strict";

module.exports = PIXI;

},{}],12:[function(require,module,exports){
"use strict";

var instantiateComponent = require("./instantiateComponent");

var lifycycle = require("./lifycycle");

var getPixi = require("./pixiInjection").getPixi;

function render(element, options) {
  if (options === void 0) {
    options = {};
  }

  var _PIXI = getPixi();

  var pixiApp = new _PIXI.Application(options);
  lifycycle.mounted.reset();
  var component = instantiateComponent(element);
  var pixiObj = component.mount();
  pixiApp.stage.addChild(pixiObj);
  lifycycle.mounted.flush();
  pixiApp.__An_Instance__ = component;
  return pixiApp;
}

module.exports = render;

},{"./instantiateComponent":8,"./lifycycle":9,"./pixiInjection":10}],13:[function(require,module,exports){
"use strict";

var dirtyComponents = [];

function update(compo) {
  compo.__instance__._dirty = true;
  dirtyComponents.push(compo.__instance__);
  updateDirtyComponents();
}

var updateDirtyComponents = debounce(function () {
  dirtyComponents.sort(function (a, b) {
    return a._id - b._id;
  });
  var cc;

  while (cc = dirtyComponents.shift()) {
    if (!cc._dirty) {
      return;
    }

    cc.receive(cc.currentElement);
  }
});

function debounce(fn, delay) {
  var t;
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    clearTimeout(t);
    t = setTimeout(function () {
      fn.apply(void 0, args);
    }, delay);
  };
}

exports.update = update;

},{}]},{},[4])(4)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQ29tcG9uZW50LmpzIiwic3JjL0NvbXBvc2l0ZUNvbXBvbmVudC5qcyIsInNyYy9OYXRpdmVDb21wb25lbnQuanMiLCJzcmMvYW4uanMiLCJzcmMvY2JxLmpzIiwic3JjL2NyZWF0ZUVsZW1lbnQuanMiLCJzcmMvZm9yRWFjaFByb3BzLmpzIiwic3JjL2luc3RhbnRpYXRlQ29tcG9uZW50LmpzIiwic3JjL2xpZnljeWNsZS5qcyIsInNyYy9waXhpSW5qZWN0aW9uLmpzIiwic3JjL3BpeGlqc1VNRFNoaW0uanMiLCJzcmMvcmVuZGVyLmpzIiwic3JjL3VwZGF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxXQUFELENBQXZCOztBQUNBLFNBQVMsU0FBVCxDQUFtQixLQUFuQixFQUEwQjtBQUN4QixPQUFLLEtBQUwsR0FBYSxLQUFiO0FBQ0Q7O0FBRUQsU0FBUyxDQUFDLFNBQVYsQ0FBb0IsRUFBcEIsR0FBeUIsRUFBekI7O0FBRUEsU0FBUyxDQUFDLFNBQVYsQ0FBb0IsUUFBcEIsR0FBK0IsVUFBUyxDQUFULEVBQVk7QUFDekMsT0FBSyxLQUFMLEdBQWEsTUFBTSxDQUFDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCLEtBQUssS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBYjtBQUNBLEVBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxJQUFmO0FBQ0QsQ0FIRDs7QUFLQSxNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFqQjs7Ozs7QUNaQSxJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBRCxDQUF6Qjs7QUFFQSxJQUFJLE9BQU8sR0FBRyxDQUFkOztBQUNBLFNBQVMsa0JBQVQsQ0FBNEIsT0FBNUIsRUFBcUM7QUFDbkMsT0FBSyxjQUFMLEdBQXNCLE9BQXRCO0FBQ0EsT0FBSyxjQUFMLEdBQXNCLElBQXRCO0FBQ0EsT0FBSyxp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c291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJjb25zdCB1cGRhdG9yID0gcmVxdWlyZShcIi4vdXBkYXRvclwiKTtcbmZ1bmN0aW9uIENvbXBvbmVudChwcm9wcykge1xuICB0aGlzLnByb3BzID0gcHJvcHM7XG59XG5cbkNvbXBvbmVudC5wcm90b3R5cGUuQW4gPSB7fTtcblxuQ29tcG9uZW50LnByb3RvdHlwZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKG8pIHtcbiAgdGhpcy5zdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUsIG8pO1xuICB1cGRhdG9yLnVwZGF0ZSh0aGlzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50O1xuIiwiY29uc3QgbGlmeWN5Y2xlID0gcmVxdWlyZShcIi4vbGlmeWN5Y2xlXCIpO1xuXG5sZXQgY291bnRlciA9IDA7XG5mdW5jdGlvbiBDb21wb3NpdGVDb21wb25lbnQoZWxlbWVudCkge1xuICB0aGlzLmN1cnJlbnRFbGVtZW50ID0gZWxlbWVudDtcbiAgdGhpcy5wdWJsaWNJbnN0YW5jZSA9IG51bGw7XG4gIHRoaXMucmVuZGVyZWRDb21wb25lbnQgPSBudWxsO1xuICB0aGlzLl9pZCA9IGNvdW50ZXIrKztcbn1cblxuQ29tcG9zaXRlQ29tcG9uZW50LnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCBlbGVtZW50ID0gdGhpcy5jdXJyZW50RWxlbWVudDtcbiAgY29uc3QgcHJvcHMgPSBlbGVtZW50LnByb3BzO1xuICBjb25zdCB0eXBlID0gZWxlbWVudC50eXBlO1xuICBjb25zdCBwdWJsaWNJbnN0YW5jZSA9IG5ldyB0eXBlKHByb3BzKTtcbiAgcHVibGljSW5zdGFuY2UucHJvcHMgPSBwcm9wcztcbiAgcHVibGljSW5zdGFuY2UuX19pbnN0YW5jZV9fID0gdGhpcztcbiAgdGhpcy5wdWJsaWNJbnN0YW5jZSA9IHB1YmxpY0luc3RhbmNlO1xuICBpZiAocHVibGljSW5zdGFuY2UuYmVmb3JlTW91bnQpIHtcbiAgICBwdWJsaWNJbnN0YW5jZS5iZWZvcmVNb3VudCgpO1xuICB9XG4gIGNvbnN0IHJlbmRlcmVkRWxlbWVudCA9IHB1YmxpY0luc3RhbmNlLnJlbmRlcigpO1xuXG4gIGNvbnN0IHJlbmRlcmVkQ29tcG9uZW50ID0gdGhpcy5pbnN0YW50aWF0ZUNvbXBvbmVudChyZW5kZXJlZEVsZW1lbnQpO1xuICB0aGlzLnJlbmRlcmVkQ29tcG9uZW50ID0gcmVuZGVyZWRDb21wb25lbnQ7XG4gIGNvbnN0IHBpeGlPYmogPSByZW5kZXJlZENvbXBvbmVudC5tb3VudCgpO1xuICBpZiAocHVibGljSW5zdGFuY2UubW91bnRlZCkge1xuICAgIGxpZnljeWNsZS5tb3VudGVkLmVucXVldWUocHVibGljSW5zdGFuY2UubW91bnRlZC5iaW5kKHB1YmxpY0luc3RhbmNlKSk7XG4gIH1cbiAgcmV0dXJuIHBpeGlPYmo7XG59O1xuXG5Db21wb3NpdGVDb21wb25lbnQucHJvdG90eXBlLmdldFBpeGlPYmogPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMucmVuZGVyZWRDb21wb25lbnQuZ2V0UGl4aU9iaigpIHx8IG51bGw7XG59O1xuXG5Db21wb3NpdGVDb21wb25lbnQucHJvdG90eXBlLnJlY2VpdmUgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIGNvbnN0IHByZXZFbGVtZW50ID0gdGhpcy5jdXJyZW50RWxlbWVudDtcbiAgY29uc3QgcHJldlByb3BzID0gcHJldkVsZW1lbnQucHJvcHM7XG4gIGNvbnN0IHByZXZUeXBlID0gcHJldkVsZW1lbnQudHlwZTtcbiAgY29uc3QgcHVibGljSW5zdGFuY2UgPSB0aGlzLnB1YmxpY0luc3RhbmNlO1xuICBjb25zdCBwcmV2UmVuZGVyZWRDb21wb25lbnQgPSB0aGlzLnJlbmRlcmVkQ29tcG9uZW50O1xuICBpZiAocHJldlR5cGUgIT09IGVsZW1lbnQudHlwZSkge1xuICAgIHRoaXMudW5tb3VudCgpO1xuICAgIHRoaXMuX2RpcnR5ID0gZmFsc2U7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChwdWJsaWNJbnN0YW5jZS5iZWZvcmVVcGRhdGUpIHtcbiAgICBwdWJsaWNJbnN0YW5jZS5iZWZvcmVVcGRhdGUoKTtcbiAgfVxuICBjb25zdCBwcm9wcyA9IGVsZW1lbnQucHJvcHM7XG4gIHB1YmxpY0luc3RhbmNlLnByb3BzID0gcHJvcHM7XG4gIGNvbnN0IG5leHRSZW5kZXJlZEVsZW1lbnQgPSBwdWJsaWNJbnN0YW5jZS5yZW5kZXIoKTtcbiAgaWYgKG5leHRSZW5kZXJlZEVsZW1lbnQudHlwZSAhPT0gcHJldlJlbmRlcmVkQ29tcG9uZW50LmN1cnJlbnRFbGVtZW50LnR5cGUpIHtcbiAgICBjb25zdCBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqID0gcHJldlJlbmRlcmVkQ29tcG9uZW50LmdldFBpeGlPYmooKTtcbiAgICBjb25zdCBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqUGFyZW50ID1cbiAgICAgIHByZXZSZW5kZXJlZENvbXBvbmVudFBpeGlPYmoucGFyZW50O1xuXG4gICAgcHJldlJlbmRlcmVkQ29tcG9uZW50LnVubW91bnQoKTtcblxuICAgIGlmIChwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqUGFyZW50KSB7XG4gICAgICBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqUGFyZW50LnJlbW92ZUNoaWxkKFxuICAgICAgICBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCBuZXh0UmVuZGVyZWRDb21wb25lbnQgPSB0aGlzLmluc3RhbnRpYXRlQ29tcG9uZW50KFxuICAgICAgbmV4dFJlbmRlcmVkRWxlbWVudFxuICAgICk7XG4gICAgY29uc3QgbmV4dFJlbmRlcmVkQ29tcG9uZW50UGl4aU9iaiA9IG5leHRSZW5kZXJlZENvbXBvbmVudC5tb3VudCgpO1xuICAgIHByZXZSZW5kZXJlZENvbXBvbmVudFBpeGlPYmpQYXJlbnQuYWRkQ2hpbGQobmV4dFJlbmRlcmVkQ29tcG9uZW50UGl4aU9iaik7XG4gICAgdGhpcy5yZW5kZXJlZENvbXBvbmVudCA9IG5leHRSZW5kZXJlZENvbXBvbmVudDtcblxuICAgIGlmIChwdWJsaWNJbnN0YW5jZS51cGRhdGVkKSB7XG4gICAgICBwdWJsaWNJbnN0YW5jZS51cGRhdGVkKCk7XG4gICAgfVxuICAgIHRoaXMuX2RpcnR5ID0gZmFsc2U7XG4gICAgcmV0dXJuO1xuICB9XG4gIHByZXZSZW5kZXJlZENvbXBvbmVudC5yZWNlaXZlKG5leHRSZW5kZXJlZEVsZW1lbnQpO1xuICBpZiAocHVibGljSW5zdGFuY2UudXBkYXRlZCkge1xuICAgIHB1YmxpY0luc3RhbmNlLnVwZGF0ZWQoKTtcbiAgfVxuICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xufTtcblxuQ29tcG9zaXRlQ29tcG9uZW50LnByb3RvdHlwZS51bm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gIGNvbnN0IHB1YmxpY0luc3RhbmNlID0gdGhpcy5wdWJsaWNJbnN0YW5jZTtcbiAgY29uc3QgcmVuZGVyZWRDb21wb25lbnQgPSB0aGlzLnJlbmRlcmVkQ29tcG9uZW50O1xuXG4gIGlmIChwdWJsaWNJbnN0YW5jZS53aWxsVW5tb3VudCkge1xuICAgIHB1YmxpY0luc3RhbmNlLndpbGxVbm1vdW50KCk7XG4gIH1cbiAgcmVuZGVyZWRDb21wb25lbnQudW5tb3VudCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb3NpdGVDb21wb25lbnQ7XG4iLCJjb25zdCBmb3JFYWNoUHJvcHMgPSByZXF1aXJlKFwiLi9mb3JFYWNoUHJvcHNcIik7XG5cbmZ1bmN0aW9uIE5hdGl2ZUNvbXBvbmVudChlbGVtZW50KSB7XG4gIHRoaXMuY3VycmVudEVsZW1lbnQgPSBlbGVtZW50O1xuICB0aGlzLnBpeGlPYmogPSBudWxsO1xuICB0aGlzLnJlbmRlcmVkQ2hpbGRyZW4gPSBudWxsO1xuICB0aGlzLl9saXN0ZW5lcnMgPSBudWxsO1xufVxuXG5OYXRpdmVDb21wb25lbnQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGVsZW1lbnQgPSB0aGlzLmN1cnJlbnRFbGVtZW50O1xuICBjb25zdCB0eXBlID0gZWxlbWVudC50eXBlO1xuICBjb25zdCBwcm9wcyA9IGVsZW1lbnQucHJvcHM7XG4gIGNvbnN0IGNoaWxkcmVuID0gcHJvcHMuY2hpbGRyZW47XG4gIGNvbnN0IGluaXRpYWxpemUgPSBwcm9wcy5pbml0aWFsaXplID8gcHJvcHMuaW5pdGlhbGl6ZS5zbGljZSgpIDogW107XG5cbiAgbGV0IHBpeGlPYmo7XG4gIGlmIChwcm9wcy5ub05ldykge1xuICAgIHBpeGlPYmogPSB0eXBlLmFwcGx5KG51bGwsIGluaXRpYWxpemUpO1xuICB9IGVsc2Uge1xuICAgIHBpeGlPYmogPSBuZXcgdHlwZSguLi5pbml0aWFsaXplKTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSBwcm9wcy5sZW5ndGg7IGktLTsgKSB7XG4gICAgbGV0IHByb3AgPSBwcm9wc1tpXTtcbiAgICBpZiAoL15vbihbXFxTXFxTXSspLy50ZXN0KHByb3ApKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lck5hbWUgPSBwcm9wLm1hdGNoKC9eb24oW1xcU1xcU10rKS8pWzFdO1xuICAgICAgY29uc3QgbGlzdGVuZXJGbiA9IHByb3BzW3Byb3BdO1xuICAgICAgcGl4aU9iai5vbihsaXN0ZW5lck5hbWUsIGxpc3RlbmVyRm4pO1xuICAgICAgKHRoaXMuX2xpc3RlbmVycyB8fCAodGhpcy5fbGlzdGVuZXJzID0gW10pKS5wdXNoKFtcbiAgICAgICAgbGlzdGVuZXJOYW1lLFxuICAgICAgICBsaXN0ZW5lckZuXG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxuICBmb3JFYWNoUHJvcHMocHJvcHMsIChrLCB2KSA9PiB7XG4gICAgcGl4aU9ialtrXSA9IHY7XG4gIH0pO1xuXG4gIHRoaXMucGl4aU9iaiA9IHBpeGlPYmo7XG5cbiAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgIGNvbnN0IHJlbmRlcmVkQ2hpbGRyZW4gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgY2hpbGQgPSB0aGlzLmluc3RhbnRpYXRlQ29tcG9uZW50KGNoaWxkcmVuW2ldKTtcbiAgICAgIGNvbnN0IGNoaWxkUGl4aU9iaiA9IGNoaWxkLm1vdW50KCk7XG4gICAgICBwaXhpT2JqLmFkZENoaWxkKGNoaWxkUGl4aU9iaik7XG4gICAgICByZW5kZXJlZENoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cbiAgICB0aGlzLnJlbmRlcmVkQ2hpbGRyZW4gPSByZW5kZXJlZENoaWxkcmVuO1xuICB9XG5cbiAgcmV0dXJuIHBpeGlPYmo7XG59O1xuXG5OYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnJlY2VpdmUgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIGNvbnN0IHByZXZFbGVtZW50ID0gdGhpcy5jdXJyZW50RWxlbWVudDtcbiAgY29uc3QgcHJldlR5cGUgPSBwcmV2RWxlbWVudC50eXBlO1xuICBjb25zdCBwcmV2UHJvcHMgPSBwcmV2RWxlbWVudC5wcm9wcztcbiAgY29uc3QgdHlwZSA9IGVsZW1lbnQudHlwZTtcbiAgdGhpcy5jdXJyZW50RWxlbWVudCA9IGVsZW1lbnQ7XG4gIGlmIChwcmV2UHJvcHMuaW5pdGlhbGl6ZSB8fCBwcmV2VHlwZSAhPT0gdHlwZSkge1xuICAgIHRoaXMudW5tb3VudCgpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH1cbn07XG5cbk5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGVsZW1lbnQgPSB0aGlzLmN1cnJlbnRFbGVtZW50O1xuICBjb25zdCBwcm9wcyA9IGVsZW1lbnQucHJvcHM7XG4gIGNvbnN0IGNoaWxkcmVuID0gcHJvcHMuY2hpbGRyZW4gfHwgW107XG4gIGNvbnN0IHBpeGlPYmogPSB0aGlzLnBpeGlPYmo7XG4gIGNvbnN0IHByZXZSZW5kZXJlZENoaWxkcmVuID0gdGhpcy5yZW5kZXJlZENoaWxkcmVuIHx8IFtdO1xuXG4gIGZvckVhY2hQcm9wcyhwcm9wcywgKGssIHYpID0+IHtcbiAgICBwaXhpT2JqW2tdID0gdjtcbiAgfSk7XG5cbiAgY29uc3QgbmV4dFJlbmRlcmVkQ2hpbGRyZW4gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IG5leHRDaGlsZEVsZW1lbnQgPSBjaGlsZHJlbltpXTtcbiAgICBjb25zdCBwcmV2Q2hpbGQgPSBwcmV2UmVuZGVyZWRDaGlsZHJlbltpXTtcbiAgICBpZiAoIXByZXZDaGlsZCkge1xuICAgICAgY29uc3QgbmV4dENoaWxkID0gdGhpcy5pbnN0YW50aWF0ZUNvbXBvbmVudChuZXh0Q2hpbGRFbGVtZW50KTtcbiAgICAgIGNvbnN0IG5leHRQaXhpT2JqID0gbmV4dENoaWxkLm1vdW50KCk7XG4gICAgICBuZXh0UmVuZGVyZWRDaGlsZHJlbi5wdXNoKG5leHRDaGlsZCk7XG4gICAgICBwaXhpT2JqLmFkZENoaWxkKG5leHRQaXhpT2JqKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBzaG91ZFVzZVVwZGF0ZSA9XG4gICAgICAhbmV4dENoaWxkRWxlbWVudC5wcm9wcy5pbml0aWFsaXplICYmXG4gICAgICBwcmV2Q2hpbGQuY3VycmVudEVsZW1lbnQudHlwZSA9PT0gbmV4dENoaWxkRWxlbWVudC50eXBlO1xuICAgIGlmICghc2hvdWRVc2VVcGRhdGUpIHtcbiAgICAgIGNvbnN0IHByZXZDaGlsZFBpeGlPYmogPSBwcmV2Q2hpbGQuZ2V0UGl4aU9iaigpO1xuICAgICAgcHJldkNoaWxkLnVubW91bnQoKTtcbiAgICAgIGlmIChwcmV2Q2hpbGRQaXhpT2JqLnBhcmVudCkge1xuICAgICAgICBwcmV2Q2hpbGRQaXhpT2JqLnBhcmVudC5yZW1vdmVDaGlsZChwcmV2Q2hpbGRQaXhpT2JqKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHRDaGlsZCA9IHRoaXMuaW5zdGFudGlhdGVDb21wb25lbnQobmV4dENoaWxkRWxlbWVudCk7XG4gICAgICBjb25zdCBuZXh0Q2hpbGRQaXhpT2JqID0gbmV4dENoaWxkLm1vdW50KCk7XG4gICAgICBuZXh0UmVuZGVyZWRDaGlsZHJlbi5wdXNoKG5leHRDaGlsZCk7XG4gICAgICBwaXhpT2JqLmFkZENoaWxkKG5leHRDaGlsZFBpeGlPYmopO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHByZXZDaGlsZC5yZWNlaXZlKG5leHRDaGlsZEVsZW1lbnQpO1xuICAgIG5leHRSZW5kZXJlZENoaWxkcmVuLnB1c2gocHJldkNoaWxkKTtcbiAgfVxuXG4gIGZvciAoXG4gICAgbGV0IGogPSBuZXh0UmVuZGVyZWRDaGlsZHJlbi5sZW5ndGg7XG4gICAgaiA8IHByZXZSZW5kZXJlZENoaWxkcmVuLmxlbmd0aDtcbiAgICBqKytcbiAgKSB7XG4gICAgY29uc3QgcHJldkNoaWxkID0gcHJldlJlbmRlcmVkQ2hpbGRyZW5bal07XG4gICAgY29uc3QgcHJldkNoaWxkUGl4aU9iaiA9IHByZXZDaGlsZC5nZXRQaXhpT2JqKCk7XG4gICAgcHJldkNoaWxkLnVubW91bnQoKTtcbiAgICBpZiAocHJldkNoaWxkUGl4aU9iai5wYXJlbnQpIHtcbiAgICAgIHByZXZDaGlsZFBpeGlPYmoucGFyZW50LnJlbW92ZUNoaWxkKHByZXZDaGlsZFBpeGlPYmopO1xuICAgIH1cbiAgfVxuICB0aGlzLnJlbmRlcmVkQ2hpbGRyZW4gPSBuZXh0UmVuZGVyZWRDaGlsZHJlbjtcbn07XG5cbk5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUuZ2V0UGl4aU9iaiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5waXhpT2JqIHx8IG51bGw7XG59O1xuXG5OYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnVubW91bnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX2xpc3RlbmVycyAmJiB0aGlzLl9saXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgZm9yIChsZXQgaSA9IHRoaXMuX2xpc3RlbmVycy5sZW5ndGg7IGktLTsgKSB7XG4gICAgICB0aGlzLnBpeGlPYmoub2ZmKHRoaXMuX2xpc3RlbmVyc1tpXVswXSwgdGhpcy5fbGlzdGVuZXJzW2ldWzFdKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5waXhpT2JqLmRlc3Ryb3koKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTmF0aXZlQ29tcG9uZW50O1xuIiwiY29uc3QgUElYSSA9IHJlcXVpcmUoJy4vcGl4aWpzVU1EU2hpbS5qcycpO1xuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gcmVxdWlyZShcIi4vY3JlYXRlRWxlbWVudFwiKTtcbmV4cG9ydHMuQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vQ29tcG9uZW50XCIpO1xuZXhwb3J0cy5yZW5kZXIgPSByZXF1aXJlKFwiLi9yZW5kZXJcIik7XG5cbnJlcXVpcmUoXCIuL3BpeGlJbmplY3Rpb25cIikuaW5qZWN0KFBJWEkpO1xuIiwiZnVuY3Rpb24gQ2FsbGJhY2tRdWV1ZSgpIHtcbiAgbGV0IGFyciA9IG51bGw7XG5cbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgKGFyciA9IGFyciB8fCBbXSkubGVuZ3RoID0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZsdXNoKGkpIHtcbiAgICBsZXQgZXJyVGhvd247XG4gICAgYXJyID0gYXJyID8gYXJyLnNsaWNlKCkgOiBbXTtcbiAgICB0cnkge1xuICAgICAgZXJyVGhvd24gPSB0cnVlO1xuICAgICAgZm9yIChpICE9PSB1bmRlZmluZWQgPyBpIDogMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBpdGVtID0gYXJyW2ldO1xuICAgICAgICBjb25zdCBmbiA9IGl0ZW1bMF07XG4gICAgICAgIGNvbnN0IGN0eCA9IGl0ZW1bMV07XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBpdGVtWzJdO1xuICAgICAgICBmbi5hcHBseShjdHgsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgZXJyVGhvd24gPSBmYWxzZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGVyclRob3duKSB7XG4gICAgICAgIGZsdXNoKGkgKyAxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc2V0KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZXNldCxcbiAgICBlbnF1ZXVlKGZuLCBjb250ZXh0KSB7XG4gICAgICBjb25zdCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgYXJyLnB1c2goW2ZuLCBjb250ZXh0LCBhcmdzXSk7XG4gICAgfSxcbiAgICBmbHVzaCgpIHtcbiAgICAgIGZsdXNoKDApO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQ2FsbGJhY2tRdWV1ZTtcbiIsImZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodHlwZSwgcHJvcHMpIHtcbiAgcHJvcHMgPSBPYmplY3QuYXNzaWduKHt9LCBwcm9wcyk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHByb3BzLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB0eXBlLFxuICAgIHByb3BzLFxuICAgICQkdHlwZW9mOiBcIkFuXCJcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50O1xuIiwiZnVuY3Rpb24gZm9yRWFjaFByb3BzKHByb3BzLCBjYikge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcHMpO1xuICBmb3IgKGxldCBpID0ga2V5cy5sZW5ndGg7IGktLTsgKSB7XG4gICAgY29uc3Qga2V5ID0ga2V5c1tpXTtcbiAgICBpZiAoa2V5ID09PSBcImNoaWxkcmVuXCIgfHwga2V5ID09PSBcImluaXRpYWxpemVcIiB8fCAvXm9uLy50ZXN0KGtleSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBwcm9wID0gcHJvcHNba2V5XTtcbiAgICBjYihrZXksIHByb3ApO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZm9yRWFjaFByb3BzO1xuIiwiY29uc3QgQ29tcG9zaXRlQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vQ29tcG9zaXRlQ29tcG9uZW50XCIpO1xuY29uc3QgTmF0aXZlQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vTmF0aXZlQ29tcG9uZW50XCIpO1xuY29uc3QgQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vQ29tcG9uZW50XCIpO1xuXG5Db21wb3NpdGVDb21wb25lbnQucHJvdG90eXBlLmluc3RhbnRpYXRlQ29tcG9uZW50ID0gaW5zdGFudGlhdGVDb21wb25lbnQ7XG5OYXRpdmVDb21wb25lbnQucHJvdG90eXBlLmluc3RhbnRpYXRlQ29tcG9uZW50ID0gaW5zdGFudGlhdGVDb21wb25lbnQ7XG5cbmZ1bmN0aW9uIGluc3RhbnRpYXRlQ29tcG9uZW50KGVsZW1lbnQpIHtcbiAgaWYgKGVsZW1lbnQudHlwZS5wcm90b3R5cGUuQW4gPT09IENvbXBvbmVudC5wcm90b3R5cGUuQW4pIHtcbiAgICByZXR1cm4gbmV3IENvbXBvc2l0ZUNvbXBvbmVudChlbGVtZW50KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE5hdGl2ZUNvbXBvbmVudChlbGVtZW50KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc3RhbnRpYXRlQ29tcG9uZW50O1xuIiwiY29uc3QgQ2JxID0gcmVxdWlyZShcIi4vY2JxXCIpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1vdW50ZWQ6IENicSgpXG59O1xuIiwibGV0IHBpeGkgPSBudWxsO1xuZXhwb3J0cy5pbmplY3QgPSBmdW5jdGlvbiBpbmplY3QoX3BpeGkpIHtcbiAgcGl4aSA9IF9waXhpO1xufTtcbmV4cG9ydHMuZ2V0UGl4aSA9IGZ1bmN0aW9uIGdldFBpeGkoKSB7XG4gIHJldHVybiBwaXhpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gUElYSTtcbiIsImNvbnN0IGluc3RhbnRpYXRlQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vaW5zdGFudGlhdGVDb21wb25lbnRcIik7XG5jb25zdCBsaWZ5Y3ljbGUgPSByZXF1aXJlKFwiLi9saWZ5Y3ljbGVcIik7XG5jb25zdCBnZXRQaXhpID0gcmVxdWlyZShcIi4vcGl4aUluamVjdGlvblwiKS5nZXRQaXhpO1xuXG5mdW5jdGlvbiByZW5kZXIoZWxlbWVudCwgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IF9QSVhJID0gZ2V0UGl4aSgpO1xuICBjb25zdCBwaXhpQXBwID0gbmV3IF9QSVhJLkFwcGxpY2F0aW9uKG9wdGlvbnMpO1xuICBsaWZ5Y3ljbGUubW91bnRlZC5yZXNldCgpO1xuICBjb25zdCBjb21wb25lbnQgPSBpbnN0YW50aWF0ZUNvbXBvbmVudChlbGVtZW50KTtcbiAgY29uc3QgcGl4aU9iaiA9IGNvbXBvbmVudC5tb3VudCgpO1xuICBwaXhpQXBwLnN0YWdlLmFkZENoaWxkKHBpeGlPYmopO1xuICBsaWZ5Y3ljbGUubW91bnRlZC5mbHVzaCgpO1xuICBwaXhpQXBwLl9fQW5fSW5zdGFuY2VfXyA9IGNvbXBvbmVudDtcblxuICByZXR1cm4gcGl4aUFwcDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXI7XG4iLCJjb25zdCBkaXJ0eUNvbXBvbmVudHMgPSBbXTtcblxuZnVuY3Rpb24gdXBkYXRlKGNvbXBvKSB7XG4gIGNvbXBvLl9faW5zdGFuY2VfXy5fZGlydHkgPSB0cnVlO1xuICBkaXJ0eUNvbXBvbmVudHMucHVzaChjb21wby5fX2luc3RhbmNlX18pO1xuICB1cGRhdGVEaXJ0eUNvbXBvbmVudHMoKTtcbn1cblxuY29uc3QgdXBkYXRlRGlydHlDb21wb25lbnRzID0gZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gIGRpcnR5Q29tcG9uZW50cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgcmV0dXJuIGEuX2lkIC0gYi5faWQ7XG4gIH0pO1xuICBsZXQgY2M7XG4gIHdoaWxlICgoY2MgPSBkaXJ0eUNvbXBvbmVudHMuc2hpZnQoKSkpIHtcbiAgICBpZiAoIWNjLl9kaXJ0eSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjYy5yZWNlaXZlKGNjLmN1cnJlbnRFbGVtZW50KTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGRlYm91bmNlKGZuLCBkZWxheSkge1xuICBsZXQgdDtcbiAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgY2xlYXJUaW1lb3V0KHQpO1xuICAgIHQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGZuKC4uLmFyZ3MpO1xuICAgIH0sIGRlbGF5KTtcbiAgfTtcbn1cblxuZXhwb3J0cy51cGRhdGUgPSB1cGRhdGU7XG4iXX0=

  });
  