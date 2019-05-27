function wrapperify(src, exposeName) {
  const toReplace = `function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.${exposeName} = f()}}`;
  if (src.indexOf(toReplace) === -1) {
    throw new Error("wrapperify failed to find code to replace");
  }
  src = src.replace(toReplace, `function(f){return f()}`);
  return `
  ;(function(f) {
    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = f(require('pixi.js'));
  
    // RequireJS
    } else if (typeof define === "function" && define.amd) {
      define(['pixi.js'], f);
  
    // <script>
    } else {
      var g;
      if (typeof window !== "undefined") {
        g = window;
      } else if (typeof global !== "undefined") {
        g = global;
      } else if (typeof self !== "undefined") {
        g = self;
      } else {
        // works providing we're not in "use strict";
        // needed for Java 8 Nashorn
        g = this;
      }
      g.${exposeName} = f(g.PIXI);
    }
  })(function(PIXI) {
    if (!PIXI) {
      throw new Error('An.js requires pixi.js as peer dependency.');
    }
    return ${src}
  });
  `;
}

module.exports = function(grunt) {
  grunt.initConfig({
    browserify: {
      lib: {
        src: ["src/an.js"],
        dest: "dist/an.js",
        options: {
          watch: true,
          browserifyOptions: {
            standalone: "An",
            debug: true
          },
          transform: [
            [
              "aliasify",
              {
                aliases: {
                  "pixi.js": "./src/pixijsUMDShim.js"
                }
              }
            ],
            "babelify",
            [
              "envify",
              {
                NODE_ENV: process.env.NODE_ENV
              }
            ]
          ],
          postBundleCB: (err, src, next) => {
            if (err) {
              next(err);
              return;
            }
            try {
              src = wrapperify(src.toString(), "An");
              next(null, src);
            } catch (err) {
              next(err);
            }
          }
        }
      }
    },
    watch: {
      scripts: {
        files: "src/**/*.(js|ts)",
        tasks: ["browserify"],
        options: {
          debounceDelay: 250
        }
      }
    }
  });
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-browserify");
  grunt.registerTask("start", ["browserify", "watch"]);
  grunt.registerTask("build", ["browserify"]);
  grunt.registerTask("default", ["start"]);
};
