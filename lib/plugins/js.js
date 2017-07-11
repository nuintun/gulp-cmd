'use strict';

var util = require('../util');

/**
 * transport
 *
 * @param vinyl
 * @param options
 * @param next
 * @returns {void}
 */
module.exports = function(vinyl, options, next) {
  var id = util.transportId(vinyl, options);
  var deps = util.transportDeps(vinyl, options);

  vinyl.contents = new Buffer(util.wrapModule(id, deps, vinyl.contents));

  next(null, vinyl);
};
