/**
 * @module js
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const utils = require('../utils');

/**
 * @function loader
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl|Promise}
 */
module.exports = function(vinyl, options) {
  const id = utils.transportId(vinyl, options);
  const deps = utils.transportDeps(vinyl, options);

  vinyl.contents = new Buffer(utils.wrapModule(id, deps, vinyl.contents, options.strict));

  return vinyl;
};
