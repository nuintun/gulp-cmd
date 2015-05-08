/**
 * Created by nuintun on 2015/4/28.
 */

'use strict';

var util = require('../util');
var colors = util.colors;
var common = require('../common');
var debug = require('debug')('transport:js');

/**
 * parser
 * @param options
 * @returns {*}
 */

function parser(options){
  return common.createStream(options, 'js', transport);
}

/**
 * transport
 * @param file
 * @param options
 * @returns {string}
 */
function transport(file, options){
  var id = common.transportId(file, options, true);
  var deps = common.transportDeps(file, options);

  file.contents = new Buffer(util.wrapModule(id, deps, file.contents));

  // debug
  debug(util.colors.infoBold('transport js file ok'));

  return file;
}

/**
 * exports module.
 */

module.exports = parser;
