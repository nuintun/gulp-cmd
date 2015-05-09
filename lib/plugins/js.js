/**
 * Created by nuintun on 2015/4/28.
 */

'use strict';

var util = require('../util');
var colors = util.colors;
var common = require('../common');
var debug = require('debug')('transport:js');

/**
 * transport
 * @param vinyl
 * @param options
 * @returns {string}
 */
function transport(vinyl, options){
  var id = common.transportId(vinyl, options);
  var deps = common.transportDeps(vinyl, options);

  vinyl.contents = new Buffer(util.wrapModule(id, deps, vinyl.contents));

  return vinyl;
}

/**
 * exports module.
 */

module.exports = common.createParser('js', transport);
