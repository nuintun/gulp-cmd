/**
 * Created by nuintun on 2015/5/5.
 */

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
  var code = 'module.exports = ' + JSON.stringify(vinyl.contents.toString()) + ';';

  vinyl.contents = new Buffer(util.wrapModule(id, [], code));

  next(null, vinyl);
};
