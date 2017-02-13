/**
 * Created by nuintun on 2015/4/28.
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
 * @returns {string}
 */
function transport(vinyl, options, next) {
  var id = common.transportId(vinyl, options);
  var deps = common.transportDeps(vinyl, options);

  vinyl.contents = new Buffer(util.wrapModule(id, deps, vinyl.contents));

  this.push(vinyl);
  next();
}

/**
 * exports module
 */
module.exports = new Plugin('js', transport);
