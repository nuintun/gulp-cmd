/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');

function parser(options){
  return common.createStream(options, 'tpl', transport);
}

function transport(file){
  var code = file
    .contents
    .toString()
    .replace(/\n|\r/g, '')
    .replace(/'/g, '\\\'');

  code = 'module.exports = \'' + code + '\';\n';

  file.contents = new Buffer(util.wrapModule(id, [], code));

  return file;
}

/**
 * exports module.
 */

module.exports = parser;
