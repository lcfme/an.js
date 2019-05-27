const CompositeComponent = require("./CompositeComponent");
const NativeComponent = require("./NativeComponent");
const Component = require("./Component");

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
