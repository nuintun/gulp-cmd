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
  let loader = utils.computeId('css-loader', options);

  // Normalize id
  loader = gutil.normalize(loader);

  // Process css loader id and path
  if (gutil.isLocal(loader)) {
    // If end with /, find index file
    if (loader.substring(loader.length - 1) === '/') {
      loader += 'index';
    }

    // Debug
    utils.debug('module deps: %p', loader);

    // Add extname
    loader = utils.addExt(loader);

    // Add include
    vinyl.package.include.unshift({
      id: loader,
      path: utils.resolve(loader, vinyl, options.wwwroot, options.base)
    });

    // Normalize id
    loader = gutil.normalize(loader);
    // Parse map
    loader = gutil.parseMap(loader, options.map);
    // Normalize id
    loader = gutil.normalize(loader);
    // Hide extname
    loader = utils.hideExt(loader);
  } else {
    // Debug
    debug('module remote deps: %p', loader);
  }

  // Import css-loader lib
  code += `var loader = require(${JSON.stringify(loader)});\n\n`;

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
  deps.unshift(loader);

  // Insert css
  if (vinyl.contents.length) {
    code += `loader.insert(${JSON.stringify(vinyl.contents.toString())});`;
  }

  vinyl.contents = new Buffer(utils.wrapModule(id, deps, code, options.strict, options.indent));

  return vinyl;
};
