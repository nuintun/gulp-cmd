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

  vinyl.contents = new Buffer(util.wrapModule(id, [], stringify(vinyl)));

  this.push(vinyl);
  next();
}

function stringify(vinyl) {
  var code = vinyl.contents.toString();

  try {
    code = JSON.parse(code);
  } catch (error) {
    // parse json error do noting
  }

  code = 'module.exports = ' + JSON.stringify(code) + ';';

  return code;
}

/**
 * exports module
 */
module.exports = new Plugin('json', transport);
