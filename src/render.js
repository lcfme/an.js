const instantiateComponent = require("./instantiateComponent");
const lifycycle = require("./lifycycle");
const getPixi = require("./pixiInjection").getPixi;

function render(element, options = {}) {
  const _PIXI = getPixi();
  const pixiApp = new _PIXI.Application(options);
  lifycycle.mounted.reset();
  const component = instantiateComponent(element);
  const pixiObj = component.mount();
  pixiApp.stage.addChild(pixiObj);
  lifycycle.mounted.flush();
  pixiApp.__An_Instance__ = component;

  return pixiApp;
}

module.exports = render;
