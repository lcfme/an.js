const forEachProps = require("./forEachProps");

function NativeComponent(element) {
  this.currentElement = element;
  this.pixiObj = null;
  this.renderedChildren = null;
  this._listeners = null;
}

NativeComponent.prototype.mount = function() {
  const element = this.currentElement;
  const type = element.type;
  const props = element.props;
  const children = props.children;
  const initialize = props.initialize ? props.initialize.slice() : [];

  let pixiObj;
  if (props.noNew) {
    pixiObj = type.apply(null, initialize);
  } else {
    pixiObj = new type(...initialize);
  }
  for (let prop in props) {
    if (/^on([\S\S]+)/i.test(prop)) {
      const listenerName = prop.match(/^on([\S\S]+)/)[1].toLowerCase();
      const listenerFn = props[prop];
      pixiObj.on(listenerName, listenerFn);
      (this._listeners || (this._listeners = [])).push([
        listenerName,
        listenerFn
      ]);
    }
  }

  forEachProps(props, (k, v) => {
    pixiObj[k] = v;
  });

  this.pixiObj = pixiObj;

  if (children && children.length) {
    const renderedChildren = [];
    for (let i = 0, l = children.length; i < l; i++) {
      const child = this.instantiateComponent(children[i]);
      const childPixiObj = child.mount();
      pixiObj.addChild(childPixiObj);
      renderedChildren.push(child);
    }
    this.renderedChildren = renderedChildren;
  }

  return pixiObj;
};

NativeComponent.prototype.receive = function(element) {
  const prevElement = this.currentElement;
  const prevType = prevElement.type;
  const prevProps = prevElement.props;
  const type = element.type;
  this.currentElement = element;
  if (prevProps.initialize || prevType !== type) {
    this.unmount();
  } else {
    this.update();
  }
};

NativeComponent.prototype.update = function() {
  const element = this.currentElement;
  const props = element.props;
  const children = props.children || [];
  const pixiObj = this.pixiObj;
  const prevRenderedChildren = this.renderedChildren || [];

  forEachProps(props, (k, v) => {
    pixiObj[k] = v;
  });

  const nextRenderedChildren = [];
  for (let i = 0; i < children.length; i++) {
    const nextChildElement = children[i];
    const prevChild = prevRenderedChildren[i];
    if (!prevChild) {
      const nextChild = this.instantiateComponent(nextChildElement);
      const nextPixiObj = nextChild.mount();
      nextRenderedChildren.push(nextChild);
      pixiObj.addChild(nextPixiObj);
      continue;
    }
    const shoudUseUpdate =
      !nextChildElement.props.initialize &&
      prevChild.currentElement.type === nextChildElement.type;
    if (!shoudUseUpdate) {
      const prevChildPixiObj = prevChild.getPixiObj();
      prevChild.unmount();
      if (prevChildPixiObj.parent) {
        prevChildPixiObj.parent.removeChild(prevChildPixiObj);
      }
      const nextChild = this.instantiateComponent(nextChildElement);
      const nextChildPixiObj = nextChild.mount();
      nextRenderedChildren.push(nextChild);
      pixiObj.addChild(nextChildPixiObj);
      continue;
    }
    prevChild.receive(nextChildElement);
    nextRenderedChildren.push(prevChild);
  }

  for (
    let j = nextRenderedChildren.length;
    j < prevRenderedChildren.length;
    j++
  ) {
    const prevChild = prevRenderedChildren[j];
    const prevChildPixiObj = prevChild.getPixiObj();
    prevChild.unmount();
    if (prevChildPixiObj.parent) {
      prevChildPixiObj.parent.removeChild(prevChildPixiObj);
    }
  }
  this.renderedChildren = nextRenderedChildren;
};

NativeComponent.prototype.getPixiObj = function() {
  return this.pixiObj || null;
};

NativeComponent.prototype.unmount = function() {
  if (this._listeners && this._listeners.length) {
    for (let i = this._listeners.length; i--; ) {
      this.pixiObj.off(this._listeners[i][0], this._listeners[i][1]);
    }
  }
  this.pixiObj.destroy();
};

module.exports = NativeComponent;
