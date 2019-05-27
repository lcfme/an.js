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

  if (props.ref) {
    props.ref(publicInstance);
  }

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

  this.currentElement = element;

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
  var element = this.currentElement;
  var props = prevElement.props;

  if (props.ref) {
    props.ref(null);
  }

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

  if (props.ref) {
    props.ref(pixiObj);
  }

  for (var prop in props) {
    if (/^on([\S\S]+)/i.test(prop)) {
      var listenerName = prop.match(/^on([\S\S]+)/)[1].toLowerCase();
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

    for (var i = 0, l = children.length; i < l; i++) {
      var child = this.instantiateComponent(children[i]);
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

  if (prevProps.initialize || prevType !== type) {
    this.unmount();
    return;
  }

  this.currentElement = element;
  this.update();
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
  var element = this.currentElement;
  var props = element.props;

  if (props.ref) {
    props.ref(null);
  }

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQ29tcG9uZW50LmpzIiwic3JjL0NvbXBvc2l0ZUNvbXBvbmVudC5qcyIsInNyYy9OYXRpdmVDb21wb25lbnQuanMiLCJzcmMvYW4uanMiLCJzcmMvY2JxLmpzIiwic3JjL2NyZWF0ZUVsZW1lbnQuanMiLCJzcmMvZm9yRWFjaFByb3BzLmpzIiwic3JjL2luc3RhbnRpYXRlQ29tcG9uZW50LmpzIiwic3JjL2xpZnljeWNsZS5qcyIsInNyYy9waXhpSW5qZWN0aW9uLmpzIiwic3JjL3BpeGlqc1VNRFNoaW0uanMiLCJzcmMvcmVuZGVyLmpzIiwic3JjL3VwZGF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxXQUFELENBQXZCOztBQUNBLFNBQVMsU0FBVCxDQUFtQixLQUFuQixFQUEwQjtBQUN4QixPQUFLLEtBQUwsR0FBYSxLQUFiO0FBQ0Q7O0FBRUQsU0FBUyxDQUFDLFNBQVYsQ0FBb0IsRUFBcEIsR0FBeUIsRUFBekI7O0FBRUEsU0FBUyxDQUFDLFNBQVYsQ0FBb0IsUUFBcEIsR0FBK0IsVUFBUyxDQUFULEVBQVk7QUFDekMsT0FBSyxLQUFMLEdBQWEsTUFBTSxDQUFDLE1BQVAsQ0FBYyxFQUFkLEVBQWtCLEtBQUssS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBYjtBQUNBLEVBQUEsT0FBTyxDQUFDLE1BQVIsQ0FBZSxJQUFmO0FBQ0QsQ0FIRDs7QUFLQSxNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFqQjs7Ozs7QUNaQSxJQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBRCxDQUF6Qjs7QUFFQSxJQUFJLE9BQU8sR0FBRyxDQUFkOztBQUNBLFNBQVMsa0JBQVQsQ0FBNEIsT0FBNUIsRUFBcUM7QUFDbkMsT0FBSyxjQUFMLEdBQXNCLE9BQXRCO0FBQ0EsT0FBSyxjQUFMLEdBQXNCLElBQXRCO0FBQ0EsT0FBSyxp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QUFDZDtBQUNEOztBQUNELElBQUEsRUFBRSxDQUFDLE9BQUgsQ0FBVyxFQUFFLENBQUMsY0FBZDtBQUNEO0FBQ0YsQ0FYcUMsQ0FBdEM7O0FBYUEsU0FBUyxRQUFULENBQWtCLEVBQWxCLEVBQXNCLEtBQXRCLEVBQTZCO0FBQzNCLE1BQUksQ0FBSjtBQUNBLFNBQU8sWUFBYTtBQUFBLHNDQUFULElBQVM7QUFBVCxNQUFBLElBQVM7QUFBQTs7QUFDbEIsSUFBQSxZQUFZLENBQUMsQ0FBRCxDQUFaO0FBQ0EsSUFBQSxDQUFDLEdBQUcsVUFBVSxDQUFDLFlBQU07QUFDbkIsTUFBQSxFQUFFLE1BQUYsU0FBTSxJQUFOO0FBQ0QsS0FGYSxFQUVYLEtBRlcsQ0FBZDtBQUdELEdBTEQ7QUFNRDs7QUFFRCxPQUFPLENBQUMsTUFBUixHQUFpQixNQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImNvbnN0IHVwZGF0b3IgPSByZXF1aXJlKFwiLi91cGRhdG9yXCIpO1xuZnVuY3Rpb24gQ29tcG9uZW50KHByb3BzKSB7XG4gIHRoaXMucHJvcHMgPSBwcm9wcztcbn1cblxuQ29tcG9uZW50LnByb3RvdHlwZS5BbiA9IHt9O1xuXG5Db21wb25lbnQucHJvdG90eXBlLnNldFN0YXRlID0gZnVuY3Rpb24obykge1xuICB0aGlzLnN0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZSwgbyk7XG4gIHVwZGF0b3IudXBkYXRlKHRoaXMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb25lbnQ7XG4iLCJjb25zdCBsaWZ5Y3ljbGUgPSByZXF1aXJlKFwiLi9saWZ5Y3ljbGVcIik7XG5cbmxldCBjb3VudGVyID0gMDtcbmZ1bmN0aW9uIENvbXBvc2l0ZUNvbXBvbmVudChlbGVtZW50KSB7XG4gIHRoaXMuY3VycmVudEVsZW1lbnQgPSBlbGVtZW50O1xuICB0aGlzLnB1YmxpY0luc3RhbmNlID0gbnVsbDtcbiAgdGhpcy5yZW5kZXJlZENvbXBvbmVudCA9IG51bGw7XG4gIHRoaXMuX2lkID0gY291bnRlcisrO1xufVxuXG5Db21wb3NpdGVDb21wb25lbnQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGVsZW1lbnQgPSB0aGlzLmN1cnJlbnRFbGVtZW50O1xuICBjb25zdCBwcm9wcyA9IGVsZW1lbnQucHJvcHM7XG4gIGNvbnN0IHR5cGUgPSBlbGVtZW50LnR5cGU7XG4gIGNvbnN0IHB1YmxpY0luc3RhbmNlID0gbmV3IHR5cGUocHJvcHMpO1xuICBwdWJsaWNJbnN0YW5jZS5wcm9wcyA9IHByb3BzO1xuICBwdWJsaWNJbnN0YW5jZS5fX2luc3RhbmNlX18gPSB0aGlzO1xuICB0aGlzLnB1YmxpY0luc3RhbmNlID0gcHVibGljSW5zdGFuY2U7XG5cbiAgaWYgKHByb3BzLnJlZikge1xuICAgIHByb3BzLnJlZihwdWJsaWNJbnN0YW5jZSk7XG4gIH1cblxuICBpZiAocHVibGljSW5zdGFuY2UuYmVmb3JlTW91bnQpIHtcbiAgICBwdWJsaWNJbnN0YW5jZS5iZWZvcmVNb3VudCgpO1xuICB9XG4gIGNvbnN0IHJlbmRlcmVkRWxlbWVudCA9IHB1YmxpY0luc3RhbmNlLnJlbmRlcigpO1xuXG4gIGNvbnN0IHJlbmRlcmVkQ29tcG9uZW50ID0gdGhpcy5pbnN0YW50aWF0ZUNvbXBvbmVudChyZW5kZXJlZEVsZW1lbnQpO1xuICB0aGlzLnJlbmRlcmVkQ29tcG9uZW50ID0gcmVuZGVyZWRDb21wb25lbnQ7XG4gIGNvbnN0IHBpeGlPYmogPSByZW5kZXJlZENvbXBvbmVudC5tb3VudCgpO1xuICBpZiAocHVibGljSW5zdGFuY2UubW91bnRlZCkge1xuICAgIGxpZnljeWNsZS5tb3VudGVkLmVucXVldWUocHVibGljSW5zdGFuY2UubW91bnRlZC5iaW5kKHB1YmxpY0luc3RhbmNlKSk7XG4gIH1cbiAgcmV0dXJuIHBpeGlPYmo7XG59O1xuXG5Db21wb3NpdGVDb21wb25lbnQucHJvdG90eXBlLmdldFBpeGlPYmogPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMucmVuZGVyZWRDb21wb25lbnQuZ2V0UGl4aU9iaigpIHx8IG51bGw7XG59O1xuXG5Db21wb3NpdGVDb21wb25lbnQucHJvdG90eXBlLnJlY2VpdmUgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIGNvbnN0IHByZXZFbGVtZW50ID0gdGhpcy5jdXJyZW50RWxlbWVudDtcbiAgY29uc3QgcHJldlByb3BzID0gcHJldkVsZW1lbnQucHJvcHM7XG4gIGNvbnN0IHByZXZUeXBlID0gcHJldkVsZW1lbnQudHlwZTtcbiAgY29uc3QgcHVibGljSW5zdGFuY2UgPSB0aGlzLnB1YmxpY0luc3RhbmNlO1xuICBjb25zdCBwcmV2UmVuZGVyZWRDb21wb25lbnQgPSB0aGlzLnJlbmRlcmVkQ29tcG9uZW50O1xuICBpZiAocHJldlR5cGUgIT09IGVsZW1lbnQudHlwZSkge1xuICAgIHRoaXMudW5tb3VudCgpO1xuICAgIHRoaXMuX2RpcnR5ID0gZmFsc2U7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuY3VycmVudEVsZW1lbnQgPSBlbGVtZW50O1xuICBpZiAocHVibGljSW5zdGFuY2UuYmVmb3JlVXBkYXRlKSB7XG4gICAgcHVibGljSW5zdGFuY2UuYmVmb3JlVXBkYXRlKCk7XG4gIH1cbiAgY29uc3QgcHJvcHMgPSBlbGVtZW50LnByb3BzO1xuICBwdWJsaWNJbnN0YW5jZS5wcm9wcyA9IHByb3BzO1xuICBjb25zdCBuZXh0UmVuZGVyZWRFbGVtZW50ID0gcHVibGljSW5zdGFuY2UucmVuZGVyKCk7XG4gIGlmIChuZXh0UmVuZGVyZWRFbGVtZW50LnR5cGUgIT09IHByZXZSZW5kZXJlZENvbXBvbmVudC5jdXJyZW50RWxlbWVudC50eXBlKSB7XG4gICAgY29uc3QgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9iaiA9IHByZXZSZW5kZXJlZENvbXBvbmVudC5nZXRQaXhpT2JqKCk7XG4gICAgY29uc3QgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialBhcmVudCA9XG4gICAgICBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqLnBhcmVudDtcblxuICAgIHByZXZSZW5kZXJlZENvbXBvbmVudC51bm1vdW50KCk7XG5cbiAgICBpZiAocHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialBhcmVudCkge1xuICAgICAgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialBhcmVudC5yZW1vdmVDaGlsZChcbiAgICAgICAgcHJldlJlbmRlcmVkQ29tcG9uZW50UGl4aU9ialxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgbmV4dFJlbmRlcmVkQ29tcG9uZW50ID0gdGhpcy5pbnN0YW50aWF0ZUNvbXBvbmVudChcbiAgICAgIG5leHRSZW5kZXJlZEVsZW1lbnRcbiAgICApO1xuICAgIGNvbnN0IG5leHRSZW5kZXJlZENvbXBvbmVudFBpeGlPYmogPSBuZXh0UmVuZGVyZWRDb21wb25lbnQubW91bnQoKTtcbiAgICBwcmV2UmVuZGVyZWRDb21wb25lbnRQaXhpT2JqUGFyZW50LmFkZENoaWxkKG5leHRSZW5kZXJlZENvbXBvbmVudFBpeGlPYmopO1xuICAgIHRoaXMucmVuZGVyZWRDb21wb25lbnQgPSBuZXh0UmVuZGVyZWRDb21wb25lbnQ7XG5cbiAgICBpZiAocHVibGljSW5zdGFuY2UudXBkYXRlZCkge1xuICAgICAgcHVibGljSW5zdGFuY2UudXBkYXRlZCgpO1xuICAgIH1cbiAgICB0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuICAgIHJldHVybjtcbiAgfVxuICBwcmV2UmVuZGVyZWRDb21wb25lbnQucmVjZWl2ZShuZXh0UmVuZGVyZWRFbGVtZW50KTtcbiAgaWYgKHB1YmxpY0luc3RhbmNlLnVwZGF0ZWQpIHtcbiAgICBwdWJsaWNJbnN0YW5jZS51cGRhdGVkKCk7XG4gIH1cbiAgdGhpcy5fZGlydHkgPSBmYWxzZTtcbn07XG5cbkNvbXBvc2l0ZUNvbXBvbmVudC5wcm90b3R5cGUudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCBwdWJsaWNJbnN0YW5jZSA9IHRoaXMucHVibGljSW5zdGFuY2U7XG4gIGNvbnN0IHJlbmRlcmVkQ29tcG9uZW50ID0gdGhpcy5yZW5kZXJlZENvbXBvbmVudDtcbiAgY29uc3QgZWxlbWVudCA9IHRoaXMuY3VycmVudEVsZW1lbnQ7XG4gIGNvbnN0IHByb3BzID0gcHJldkVsZW1lbnQucHJvcHM7XG5cbiAgaWYgKHByb3BzLnJlZikge1xuICAgIHByb3BzLnJlZihudWxsKTtcbiAgfVxuXG4gIGlmIChwdWJsaWNJbnN0YW5jZS53aWxsVW5tb3VudCkge1xuICAgIHB1YmxpY0luc3RhbmNlLndpbGxVbm1vdW50KCk7XG4gIH1cbiAgcmVuZGVyZWRDb21wb25lbnQudW5tb3VudCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb3NpdGVDb21wb25lbnQ7XG4iLCJjb25zdCBmb3JFYWNoUHJvcHMgPSByZXF1aXJlKFwiLi9mb3JFYWNoUHJvcHNcIik7XG5cbmZ1bmN0aW9uIE5hdGl2ZUNvbXBvbmVudChlbGVtZW50KSB7XG4gIHRoaXMuY3VycmVudEVsZW1lbnQgPSBlbGVtZW50O1xuICB0aGlzLnBpeGlPYmogPSBudWxsO1xuICB0aGlzLnJlbmRlcmVkQ2hpbGRyZW4gPSBudWxsO1xuICB0aGlzLl9saXN0ZW5lcnMgPSBudWxsO1xufVxuXG5OYXRpdmVDb21wb25lbnQucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGVsZW1lbnQgPSB0aGlzLmN1cnJlbnRFbGVtZW50O1xuICBjb25zdCB0eXBlID0gZWxlbWVudC50eXBlO1xuICBjb25zdCBwcm9wcyA9IGVsZW1lbnQucHJvcHM7XG4gIGNvbnN0IGNoaWxkcmVuID0gcHJvcHMuY2hpbGRyZW47XG4gIGNvbnN0IGluaXRpYWxpemUgPSBwcm9wcy5pbml0aWFsaXplID8gcHJvcHMuaW5pdGlhbGl6ZS5zbGljZSgpIDogW107XG5cbiAgbGV0IHBpeGlPYmo7XG4gIGlmIChwcm9wcy5ub05ldykge1xuICAgIHBpeGlPYmogPSB0eXBlLmFwcGx5KG51bGwsIGluaXRpYWxpemUpO1xuICB9IGVsc2Uge1xuICAgIHBpeGlPYmogPSBuZXcgdHlwZSguLi5pbml0aWFsaXplKTtcbiAgfVxuICBpZiAocHJvcHMucmVmKSB7XG4gICAgcHJvcHMucmVmKHBpeGlPYmopO1xuICB9XG4gIGZvciAobGV0IHByb3AgaW4gcHJvcHMpIHtcbiAgICBpZiAoL15vbihbXFxTXFxTXSspL2kudGVzdChwcm9wKSkge1xuICAgICAgY29uc3QgbGlzdGVuZXJOYW1lID0gcHJvcC5tYXRjaCgvXm9uKFtcXFNcXFNdKykvKVsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgY29uc3QgbGlzdGVuZXJGbiA9IHByb3BzW3Byb3BdO1xuICAgICAgcGl4aU9iai5vbihsaXN0ZW5lck5hbWUsIGxpc3RlbmVyRm4pO1xuICAgICAgKHRoaXMuX2xpc3RlbmVycyB8fCAodGhpcy5fbGlzdGVuZXJzID0gW10pKS5wdXNoKFtcbiAgICAgICAgbGlzdGVuZXJOYW1lLFxuICAgICAgICBsaXN0ZW5lckZuXG4gICAgICBdKTtcbiAgICB9XG4gIH1cblxuICBmb3JFYWNoUHJvcHMocHJvcHMsIChrLCB2KSA9PiB7XG4gICAgcGl4aU9ialtrXSA9IHY7XG4gIH0pO1xuXG4gIHRoaXMucGl4aU9iaiA9IHBpeGlPYmo7XG5cbiAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xuICAgIGNvbnN0IHJlbmRlcmVkQ2hpbGRyZW4gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgY2hpbGQgPSB0aGlzLmluc3RhbnRpYXRlQ29tcG9uZW50KGNoaWxkcmVuW2ldKTtcbiAgICAgIGNvbnN0IGNoaWxkUGl4aU9iaiA9IGNoaWxkLm1vdW50KCk7XG4gICAgICBwaXhpT2JqLmFkZENoaWxkKGNoaWxkUGl4aU9iaik7XG4gICAgICByZW5kZXJlZENoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cbiAgICB0aGlzLnJlbmRlcmVkQ2hpbGRyZW4gPSByZW5kZXJlZENoaWxkcmVuO1xuICB9XG5cbiAgcmV0dXJuIHBpeGlPYmo7XG59O1xuXG5OYXRpdmVDb21wb25lbnQucHJvdG90eXBlLnJlY2VpdmUgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIGNvbnN0IHByZXZFbGVtZW50ID0gdGhpcy5jdXJyZW50RWxlbWVudDtcbiAgY29uc3QgcHJldlR5cGUgPSBwcmV2RWxlbWVudC50eXBlO1xuICBjb25zdCBwcmV2UHJvcHMgPSBwcmV2RWxlbWVudC5wcm9wcztcbiAgY29uc3QgdHlwZSA9IGVsZW1lbnQudHlwZTtcbiAgaWYgKHByZXZQcm9wcy5pbml0aWFsaXplIHx8IHByZXZUeXBlICE9PSB0eXBlKSB7XG4gICAgdGhpcy51bm1vdW50KCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuY3VycmVudEVsZW1lbnQgPSBlbGVtZW50O1xuICB0aGlzLnVwZGF0ZSgpO1xufTtcblxuTmF0aXZlQ29tcG9uZW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgY29uc3QgZWxlbWVudCA9IHRoaXMuY3VycmVudEVsZW1lbnQ7XG4gIGNvbnN0IHByb3BzID0gZWxlbWVudC5wcm9wcztcbiAgY29uc3QgY2hpbGRyZW4gPSBwcm9wcy5jaGlsZHJlbiB8fCBbXTtcbiAgY29uc3QgcGl4aU9iaiA9IHRoaXMucGl4aU9iajtcbiAgY29uc3QgcHJldlJlbmRlcmVkQ2hpbGRyZW4gPSB0aGlzLnJlbmRlcmVkQ2hpbGRyZW4gfHwgW107XG5cbiAgZm9yRWFjaFByb3BzKHByb3BzLCAoaywgdikgPT4ge1xuICAgIHBpeGlPYmpba10gPSB2O1xuICB9KTtcblxuICBjb25zdCBuZXh0UmVuZGVyZWRDaGlsZHJlbiA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbmV4dENoaWxkRWxlbWVudCA9IGNoaWxkcmVuW2ldO1xuICAgIGNvbnN0IHByZXZDaGlsZCA9IHByZXZSZW5kZXJlZENoaWxkcmVuW2ldO1xuICAgIGlmICghcHJldkNoaWxkKSB7XG4gICAgICBjb25zdCBuZXh0Q2hpbGQgPSB0aGlzLmluc3RhbnRpYXRlQ29tcG9uZW50KG5leHRDaGlsZEVsZW1lbnQpO1xuICAgICAgY29uc3QgbmV4dFBpeGlPYmogPSBuZXh0Q2hpbGQubW91bnQoKTtcbiAgICAgIG5leHRSZW5kZXJlZENoaWxkcmVuLnB1c2gobmV4dENoaWxkKTtcbiAgICAgIHBpeGlPYmouYWRkQ2hpbGQobmV4dFBpeGlPYmopO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHNob3VkVXNlVXBkYXRlID1cbiAgICAgICFuZXh0Q2hpbGRFbGVtZW50LnByb3BzLmluaXRpYWxpemUgJiZcbiAgICAgIHByZXZDaGlsZC5jdXJyZW50RWxlbWVudC50eXBlID09PSBuZXh0Q2hpbGRFbGVtZW50LnR5cGU7XG4gICAgaWYgKCFzaG91ZFVzZVVwZGF0ZSkge1xuICAgICAgY29uc3QgcHJldkNoaWxkUGl4aU9iaiA9IHByZXZDaGlsZC5nZXRQaXhpT2JqKCk7XG4gICAgICBwcmV2Q2hpbGQudW5tb3VudCgpO1xuICAgICAgaWYgKHByZXZDaGlsZFBpeGlPYmoucGFyZW50KSB7XG4gICAgICAgIHByZXZDaGlsZFBpeGlPYmoucGFyZW50LnJlbW92ZUNoaWxkKHByZXZDaGlsZFBpeGlPYmopO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV4dENoaWxkID0gdGhpcy5pbnN0YW50aWF0ZUNvbXBvbmVudChuZXh0Q2hpbGRFbGVtZW50KTtcbiAgICAgIGNvbnN0IG5leHRDaGlsZFBpeGlPYmogPSBuZXh0Q2hpbGQubW91bnQoKTtcbiAgICAgIG5leHRSZW5kZXJlZENoaWxkcmVuLnB1c2gobmV4dENoaWxkKTtcbiAgICAgIHBpeGlPYmouYWRkQ2hpbGQobmV4dENoaWxkUGl4aU9iaik7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcHJldkNoaWxkLnJlY2VpdmUobmV4dENoaWxkRWxlbWVudCk7XG4gICAgbmV4dFJlbmRlcmVkQ2hpbGRyZW4ucHVzaChwcmV2Q2hpbGQpO1xuICB9XG5cbiAgZm9yIChcbiAgICBsZXQgaiA9IG5leHRSZW5kZXJlZENoaWxkcmVuLmxlbmd0aDtcbiAgICBqIDwgcHJldlJlbmRlcmVkQ2hpbGRyZW4ubGVuZ3RoO1xuICAgIGorK1xuICApIHtcbiAgICBjb25zdCBwcmV2Q2hpbGQgPSBwcmV2UmVuZGVyZWRDaGlsZHJlbltqXTtcbiAgICBjb25zdCBwcmV2Q2hpbGRQaXhpT2JqID0gcHJldkNoaWxkLmdldFBpeGlPYmooKTtcbiAgICBwcmV2Q2hpbGQudW5tb3VudCgpO1xuICAgIGlmIChwcmV2Q2hpbGRQaXhpT2JqLnBhcmVudCkge1xuICAgICAgcHJldkNoaWxkUGl4aU9iai5wYXJlbnQucmVtb3ZlQ2hpbGQocHJldkNoaWxkUGl4aU9iaik7XG4gICAgfVxuICB9XG4gIHRoaXMucmVuZGVyZWRDaGlsZHJlbiA9IG5leHRSZW5kZXJlZENoaWxkcmVuO1xufTtcblxuTmF0aXZlQ29tcG9uZW50LnByb3RvdHlwZS5nZXRQaXhpT2JqID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnBpeGlPYmogfHwgbnVsbDtcbn07XG5cbk5hdGl2ZUNvbXBvbmVudC5wcm90b3R5cGUudW5tb3VudCA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCBlbGVtZW50ID0gdGhpcy5jdXJyZW50RWxlbWVudDtcbiAgY29uc3QgcHJvcHMgPSBlbGVtZW50LnByb3BzO1xuXG4gIGlmIChwcm9wcy5yZWYpIHtcbiAgICBwcm9wcy5yZWYobnVsbCk7XG4gIH1cbiAgaWYgKHRoaXMuX2xpc3RlbmVycyAmJiB0aGlzLl9saXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgZm9yIChsZXQgaSA9IHRoaXMuX2xpc3RlbmVycy5sZW5ndGg7IGktLTsgKSB7XG4gICAgICB0aGlzLnBpeGlPYmoub2ZmKHRoaXMuX2xpc3RlbmVyc1tpXVswXSwgdGhpcy5fbGlzdGVuZXJzW2ldWzFdKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5waXhpT2JqLmRlc3Ryb3koKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTmF0aXZlQ29tcG9uZW50O1xuIiwiY29uc3QgUElYSSA9IHJlcXVpcmUoJy4vcGl4aWpzVU1EU2hpbS5qcycpO1xuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gcmVxdWlyZShcIi4vY3JlYXRlRWxlbWVudFwiKTtcbmV4cG9ydHMuQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vQ29tcG9uZW50XCIpO1xuZXhwb3J0cy5yZW5kZXIgPSByZXF1aXJlKFwiLi9yZW5kZXJcIik7XG5cbnJlcXVpcmUoXCIuL3BpeGlJbmplY3Rpb25cIikuaW5qZWN0KFBJWEkpO1xuIiwiZnVuY3Rpb24gQ2FsbGJhY2tRdWV1ZSgpIHtcbiAgbGV0IGFyciA9IG51bGw7XG5cbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgKGFyciA9IGFyciB8fCBbXSkubGVuZ3RoID0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZsdXNoKGkpIHtcbiAgICBsZXQgZXJyVGhvd247XG4gICAgYXJyID0gYXJyID8gYXJyLnNsaWNlKCkgOiBbXTtcbiAgICB0cnkge1xuICAgICAgZXJyVGhvd24gPSB0cnVlO1xuICAgICAgZm9yIChpICE9PSB1bmRlZmluZWQgPyBpIDogMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBpdGVtID0gYXJyW2ldO1xuICAgICAgICBjb25zdCBmbiA9IGl0ZW1bMF07XG4gICAgICAgIGNvbnN0IGN0eCA9IGl0ZW1bMV07XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBpdGVtWzJdO1xuICAgICAgICBmbi5hcHBseShjdHgsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgZXJyVGhvd24gPSBmYWxzZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGVyclRob3duKSB7XG4gICAgICAgIGZsdXNoKGkgKyAxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc2V0KCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZXNldCxcbiAgICBlbnF1ZXVlKGZuLCBjb250ZXh0KSB7XG4gICAgICBjb25zdCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgYXJyLnB1c2goW2ZuLCBjb250ZXh0LCBhcmdzXSk7XG4gICAgfSxcbiAgICBmbHVzaCgpIHtcbiAgICAgIGZsdXNoKDApO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gQ2FsbGJhY2tRdWV1ZTtcbiIsImZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodHlwZSwgcHJvcHMpIHtcbiAgcHJvcHMgPSBPYmplY3QuYXNzaWduKHt9LCBwcm9wcyk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xuICAgIGNvbnN0IGNoaWxkcmVuID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHByb3BzLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB0eXBlLFxuICAgIHByb3BzLFxuICAgICQkdHlwZW9mOiBcIkFuXCJcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50O1xuIiwiZnVuY3Rpb24gZm9yRWFjaFByb3BzKHByb3BzLCBjYikge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcHMpO1xuICBmb3IgKGxldCBpID0ga2V5cy5sZW5ndGg7IGktLTsgKSB7XG4gICAgY29uc3Qga2V5ID0ga2V5c1tpXTtcbiAgICBpZiAoa2V5ID09PSBcImNoaWxkcmVuXCIgfHwga2V5ID09PSBcImluaXRpYWxpemVcIiB8fCAvXm9uLy50ZXN0KGtleSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBwcm9wID0gcHJvcHNba2V5XTtcbiAgICBjYihrZXksIHByb3ApO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZm9yRWFjaFByb3BzO1xuIiwiY29uc3QgQ29tcG9zaXRlQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vQ29tcG9zaXRlQ29tcG9uZW50XCIpO1xuY29uc3QgTmF0aXZlQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vTmF0aXZlQ29tcG9uZW50XCIpO1xuY29uc3QgQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vQ29tcG9uZW50XCIpO1xuXG5Db21wb3NpdGVDb21wb25lbnQucHJvdG90eXBlLmluc3RhbnRpYXRlQ29tcG9uZW50ID0gaW5zdGFudGlhdGVDb21wb25lbnQ7XG5OYXRpdmVDb21wb25lbnQucHJvdG90eXBlLmluc3RhbnRpYXRlQ29tcG9uZW50ID0gaW5zdGFudGlhdGVDb21wb25lbnQ7XG5cbmZ1bmN0aW9uIGluc3RhbnRpYXRlQ29tcG9uZW50KGVsZW1lbnQpIHtcbiAgaWYgKGVsZW1lbnQudHlwZS5wcm90b3R5cGUuQW4gPT09IENvbXBvbmVudC5wcm90b3R5cGUuQW4pIHtcbiAgICByZXR1cm4gbmV3IENvbXBvc2l0ZUNvbXBvbmVudChlbGVtZW50KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE5hdGl2ZUNvbXBvbmVudChlbGVtZW50KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc3RhbnRpYXRlQ29tcG9uZW50O1xuIiwiY29uc3QgQ2JxID0gcmVxdWlyZShcIi4vY2JxXCIpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1vdW50ZWQ6IENicSgpXG59O1xuIiwibGV0IHBpeGkgPSBudWxsO1xuZXhwb3J0cy5pbmplY3QgPSBmdW5jdGlvbiBpbmplY3QoX3BpeGkpIHtcbiAgcGl4aSA9IF9waXhpO1xufTtcbmV4cG9ydHMuZ2V0UGl4aSA9IGZ1bmN0aW9uIGdldFBpeGkoKSB7XG4gIHJldHVybiBwaXhpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gUElYSTtcbiIsImNvbnN0IGluc3RhbnRpYXRlQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vaW5zdGFudGlhdGVDb21wb25lbnRcIik7XG5jb25zdCBsaWZ5Y3ljbGUgPSByZXF1aXJlKFwiLi9saWZ5Y3ljbGVcIik7XG5jb25zdCBnZXRQaXhpID0gcmVxdWlyZShcIi4vcGl4aUluamVjdGlvblwiKS5nZXRQaXhpO1xuXG5mdW5jdGlvbiByZW5kZXIoZWxlbWVudCwgb3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IF9QSVhJID0gZ2V0UGl4aSgpO1xuICBjb25zdCBwaXhpQXBwID0gbmV3IF9QSVhJLkFwcGxpY2F0aW9uKG9wdGlvbnMpO1xuICBsaWZ5Y3ljbGUubW91bnRlZC5yZXNldCgpO1xuICBjb25zdCBjb21wb25lbnQgPSBpbnN0YW50aWF0ZUNvbXBvbmVudChlbGVtZW50KTtcbiAgY29uc3QgcGl4aU9iaiA9IGNvbXBvbmVudC5tb3VudCgpO1xuICBwaXhpQXBwLnN0YWdlLmFkZENoaWxkKHBpeGlPYmopO1xuICBsaWZ5Y3ljbGUubW91bnRlZC5mbHVzaCgpO1xuICBwaXhpQXBwLl9fQW5fSW5zdGFuY2VfXyA9IGNvbXBvbmVudDtcblxuICByZXR1cm4gcGl4aUFwcDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXI7XG4iLCJjb25zdCBkaXJ0eUNvbXBvbmVudHMgPSBbXTtcblxuZnVuY3Rpb24gdXBkYXRlKGNvbXBvKSB7XG4gIGNvbXBvLl9faW5zdGFuY2VfXy5fZGlydHkgPSB0cnVlO1xuICBkaXJ0eUNvbXBvbmVudHMucHVzaChjb21wby5fX2luc3RhbmNlX18pO1xuICB1cGRhdGVEaXJ0eUNvbXBvbmVudHMoKTtcbn1cblxuY29uc3QgdXBkYXRlRGlydHlDb21wb25lbnRzID0gZGVib3VuY2UoZnVuY3Rpb24oKSB7XG4gIGRpcnR5Q29tcG9uZW50cy5zb3J0KChhLCBiKSA9PiB7XG4gICAgcmV0dXJuIGEuX2lkIC0gYi5faWQ7XG4gIH0pO1xuICBsZXQgY2M7XG4gIHdoaWxlICgoY2MgPSBkaXJ0eUNvbXBvbmVudHMuc2hpZnQoKSkpIHtcbiAgICBpZiAoIWNjLl9kaXJ0eSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjYy5yZWNlaXZlKGNjLmN1cnJlbnRFbGVtZW50KTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGRlYm91bmNlKGZuLCBkZWxheSkge1xuICBsZXQgdDtcbiAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgY2xlYXJUaW1lb3V0KHQpO1xuICAgIHQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGZuKC4uLmFyZ3MpO1xuICAgIH0sIGRlbGF5KTtcbiAgfTtcbn1cblxuZXhwb3J0cy51cGRhdGUgPSB1cGRhdGU7XG4iXX0=

  });
  