function CallbackQueue() {
  let arr = null;

  function reset() {
    (arr = arr || []).length = 0;
  }

  function flush(i) {
    let errThown;
    arr = arr ? arr.slice() : [];
    try {
      errThown = true;
      for (i !== undefined ? i : 0; i < arr.length; i++) {
        const item = arr[i];
        const fn = item[0];
        const ctx = item[1];
        const args = item[2];
        fn.apply(ctx, args);
      }
      errThown = false;
    } finally {
      if (errThown) {
        flush(i + 1);
      } else {
        reset();
      }
    }
  }

  return {
    reset,
    enqueue(fn, context) {
      const args = [].slice.call(arguments, 2);
      arr = arr || [];
      arr.push([fn, context, args]);
    },
    flush() {
      flush(0);
    }
  };
}

exports = module.exports = CallbackQueue;
