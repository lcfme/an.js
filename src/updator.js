const dirtyComponents = [];

function update(compo) {
  compo.__instance__._dirty = true;
  dirtyComponents.push(compo.__instance__);
  updateDirtyComponents();
}

const updateDirtyComponents = debounce(function() {
  dirtyComponents.sort((a, b) => {
    return a._id - b._id;
  });
  let cc;
  while ((cc = dirtyComponents.shift())) {
    if (!cc._dirty) {
      return;
    }
    cc.receive(cc.currentElement);
  }
});

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

exports.update = update;
