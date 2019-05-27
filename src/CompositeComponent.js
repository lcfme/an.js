const lifycycle = require("./lifycycle");

let counter = 0;
function CompositeComponent(element) {
  this.currentElement = element;
  this.publicInstance = null;
  this.renderedComponent = null;
  this._id = counter++;
}

CompositeComponent.prototype.mount = function() {
  const element = this.currentElement;
  const props = element.props;
  const type = element.type;
  const publicInstance = new type(props);
  publicInstance.props = props;
  publicInstance.__instance__ = this;
  this.publicInstance = publicInstance;
  if (publicInstance.beforeMount) {
    publicInstance.beforeMount();
  }
  const renderedElement = publicInstance.render();

  const renderedComponent = this.instantiateComponent(renderedElement);
  this.renderedComponent = renderedComponent;
  const pixiObj = renderedComponent.mount();
  if (publicInstance.mounted) {
    lifycycle.mounted.enqueue(publicInstance.mounted.bind(publicInstance));
  }
  return pixiObj;
};

CompositeComponent.prototype.getPixiObj = function() {
  return this.renderedComponent.getPixiObj() || null;
};

CompositeComponent.prototype.receive = function(element) {
  const prevElement = this.currentElement;
  const prevProps = prevElement.props;
  const prevType = prevElement.type;
  const publicInstance = this.publicInstance;
  const prevRenderedComponent = this.renderedComponent;
  if (prevType !== element.type) {
    this.unmount();
    this._dirty = false;
    return;
  }
  if (publicInstance.beforeUpdate) {
    publicInstance.beforeUpdate();
  }
  const props = element.props;
  publicInstance.props = props;
  const nextRenderedElement = publicInstance.render();
  if (nextRenderedElement.type !== prevRenderedComponent.currentElement.type) {
    const prevRenderedComponentPixiObj = prevRenderedComponent.getPixiObj();
    const prevRenderedComponentPixiObjParent =
      prevRenderedComponentPixiObj.parent;

    prevRenderedComponent.unmount();

    if (prevRenderedComponentPixiObjParent) {
      prevRenderedComponentPixiObjParent.removeChild(
        prevRenderedComponentPixiObj
      );
    }
    const nextRenderedComponent = this.instantiateComponent(
      nextRenderedElement
    );
    const nextRenderedComponentPixiObj = nextRenderedComponent.mount();
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

CompositeComponent.prototype.unmount = function() {
  const publicInstance = this.publicInstance;
  const renderedComponent = this.renderedComponent;

  if (publicInstance.willUnmount) {
    publicInstance.willUnmount();
  }
  renderedComponent.unmount();
};

module.exports = CompositeComponent;
