/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');

function parser(options){
  return common.createStream(options, 'json', parser);
}

function transport(file){
  var id = common.transportId(file, options, true);

  file.contents = new Buffer(util.wrapModule(id, [], stringify(file)));

  return file;
}

function stringify(file){
  var code = file.contents.toString();

  return 'module.exports = ' + JSON.stringify(JSON.parse(code) + ';\n');
}

/**
 * exports module.
 */

module.exports = parser;
