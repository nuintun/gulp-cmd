/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var debug = require('debug')('transport:tpl');

function parser(options){
  return common.createStream(options, 'tpl', transport);
}

function transport(file, options){
  var code = file
    .contents
    .toString()
    .replace(/\n|\r/g, '')
    .replace(/'/g, '\\\'');
  var id = common.transportId(file, options, true);

  code = 'module.exports = \'' + code + '\';';

  file.contents = new Buffer(util.wrapModule(id, [], code));

  // debug
  debug(util.colors.infoBold('transport tpl file ok'));

  return file;
}

/**
 * exports module.
 */

module.exports = parser;
