function createElement(type, props) {
  props = Object.assign({}, props);
  if (arguments.length > 2) {
    const children = [].slice.call(arguments, 2);
    props.children = children;
  }
  return {
    type,
    props,
    $$typeof: "An"
  };
}

module.exports = createElement;
