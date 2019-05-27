function forEachProps(props, cb) {
  const keys = Object.keys(props);
  for (let i = keys.length; i--; ) {
    const key = keys[i];
    if (key === "children" || key === "initialize" || /^on/.test(key)) {
      continue;
    }
    const prop = props[key];
    cb(key, prop);
  }
}

module.exports = forEachProps;
