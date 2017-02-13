/**
 * Created by nuintun on 2015/5/9.
 */

'use strict';

var util = require('../util');
var Plugin = require('../plugin');

/**
 * transport
 * @param vinyl
 * @param options
 * @param next
 * @returns {*}
 */
function transport(vinyl, options, next) {
  this.push(vinyl);
  next();
}

/**
 * exports module
 */
module.exports = new Plugin('other', transport);
