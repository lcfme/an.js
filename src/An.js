const PIXI = require("pixi.js");
exports.createElement = require("./createElement");
exports.Component = require("./Component");
exports.render = require("./render");

require("./pixiInjection").inject(PIXI);
