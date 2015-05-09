/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');

function transport(vinyl, options){
  var id = common.transportId(vinyl, options);

  vinyl.contents = new Buffer(util.wrapModule(id, [], stringify(vinyl)));

  return vinyl;
}

function stringify(vinyl){
  var code = vinyl.contents.toString();

  return 'module.exports = ' + JSON.stringify(JSON.parse(code)) + ';';
}

/**
 * exports module.
 */

module.exports = common.createParser('json', transport);
