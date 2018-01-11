/**
 * @module html
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
  const code = 'module.exports = ' + JSON.stringify(vinyl.contents.toString()) + ';';

  vinyl.contents = new Buffer(utils.wrapModule(id, [], code, options.strict, options.indent));

  return vinyl;
};
