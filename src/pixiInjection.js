let pixi = null;
exports.inject = function inject(_pixi) {
  pixi = _pixi;
};
exports.getPixi = function getPixi() {
  return pixi;
};
