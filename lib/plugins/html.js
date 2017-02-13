/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var Plugin = require('../plugin');

/**
 * transport
 * @param vinyl
 * @param options
 * @param next
 * @returns {*}
 */
function transport(vinyl, options, next) {
  var id = common.transportId(vinyl, options);
  var code = 'module.exports = ' + JSON.stringify(vinyl.contents.toString()) + ';';

  vinyl.contents = new Buffer(util.wrapModule(id, [], code));

  this.push(vinyl);
  next();
}

/**
 * exports module
 */
module.exports = new Plugin('html', transport);
