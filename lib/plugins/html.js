/*!
 * plugins/html
 * Version: 0.0.1
 * Date: 2017/07/11
 * https://github.com/nuintun/gulp-cmd
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-cmd/blob/master/LICENSE
 */

'use strict';

var util = require('../util');

/**
 * loader
 *
 * @param vinyl
 * @param options
 * @returns {void}
 */
module.exports = function(vinyl, options) {
  var id = util.transportId(vinyl, options);
  var code = 'module.exports = ' + JSON.stringify(vinyl.contents.toString()) + ';';

  vinyl.contents = new Buffer(util.wrapModule(id, [], code));

  return vinyl;
};
