const instantiateComponent = require("./instantiateComponent");
const lifycycle = require("./lifycycle");
const getPixi = require("./pixiInjection").getPixi;

function render(element, displayContObj) {
  if (displayContObj.__An_Instance__) {
    displayContObj.__An_Instance__.unmount();
  }
  lifycycle.mounted.reset();
  const component = instantiateComponent(element);
  const pixiObj = component.mount();
  displayContObj.addChild(pixiObj);
  lifycycle.mounted.flush();
  displayContObj.__An_Instance__ = component;
  return displayContObj;
}

module.exports = render;
