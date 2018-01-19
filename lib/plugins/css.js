/**
 * @module css
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const path = require('path');
const utils = require('../utils');
const gutil = require('@nuintun/gulp-util');

const extname = path.extname;

/**
 * @function loader
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl|Promise}
 */
module.exports = function(vinyl, options) {
  let code = '';
  const id = utils.transportId(vinyl, options);
  let deps = utils.transportCssDeps(vinyl, options);
  let loader = options.css.loader;

  // Process css loader id and path
  if (loader.isLocal) {
    // Add include
    vinyl.package.include.unshift({
      id: 'css-loader',
      path: loader.path
    });
  }

  // Import css-loader lib
  code += `var loader = require(${JSON.stringify(loader.id)});\n\n`;

  // Add require css
  deps = deps.filter(id => {
    if (gutil.isLocal(id)) {
      code += `require(${JSON.stringify(id)});\n`;

      return true;
    }

    code += `loader.link("@import ${JSON.stringify(id)};");\n`;

    return false;
  });

  // Add css loader dependencies
  deps.unshift(loader.id);

  // Insert css
  if (vinyl.contents.length) {
    code += `loader.insert(${JSON.stringify(vinyl.contents.toString())});`;
  }

  vinyl.contents = new Buffer(utils.wrapModule(id, deps, code, options.strict, options.indent));

  return vinyl;
};
