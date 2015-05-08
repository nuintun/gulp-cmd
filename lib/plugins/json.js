/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var debug = require('debug')('transport:json');

function parser(options){
  return common.createStream(options, 'json', transport);
}

function transport(file, options){
  var id = common.transportId(file, options, true);

  file.contents = new Buffer(util.wrapModule(id, [], stringify(file)));

  // debug
  debug(util.colors.infoBold('transport json file ok'));

  return file;
}

function stringify(file){
  var code = file.contents.toString();

  return 'module.exports = ' + JSON.stringify(JSON.parse(code)) + ';';
}

/**
 * exports module.
 */

module.exports = parser;
