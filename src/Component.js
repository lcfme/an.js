const updator = require("./updator");
function Component(props) {
  this.props = props;
}

Component.prototype.An = {};

Component.prototype.setState = function(o) {
  this.state = Object.assign({}, this.state, o);
  updator.update(this);
};

module.exports = Component;
