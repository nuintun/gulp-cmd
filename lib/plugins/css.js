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
  let loaderId = utils.parseAlias('css-loader', options.alias);

  // Debug
  utils.debug('module deps: %p', loaderId);

  // Process css loader id and path
  if (gutil.isLocal(loaderId)) {
    let loader;

    // Add extname
    loader = loaderId = utils.addExt(loaderId);
    // Rename
    loaderId = utils.rename(loaderId, options.rename);
    // Hide extname
    loaderId = utils.hideExt(loaderId);
    // Normalize id
    loaderId = gutil.normalize(loaderId);
    // CSS loader path
    loader = utils.resolve(loader, vinyl, options.wwwroot, options.base);
    // Parse map
    loaderId = gutil.parseMap(loaderId, options.map);

    // Add include
    vinyl.package.include.unshift({
      id: loaderId,
      path: loader
    });
  }

  // Import css-loader lib
  code += 'var loader = require(' + JSON.stringify(loaderId) + ');\n\n';

  // Add require css
  deps = deps.filter(id => {
    if (gutil.isLocal(id)) {
      code += 'require(' + JSON.stringify(id) + ');\n';

      return true;
    }

    code += 'loader.link("@import ' + JSON.stringify(id) + ';");\n';

    return false;
  });

  // Add css loader dependencies
  deps.unshift(loaderId);

  // Insert css
  if (vinyl.contents.length) {
    code += 'loader.insert(' + JSON.stringify(vinyl.contents.toString()) + ');';
  }

  vinyl.contents = new Buffer(utils.wrapModule(id, deps, code, options.strict, options.indent));

  return vinyl;
};
