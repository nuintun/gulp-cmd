/**
 * Created by nuintun on 2015/4/28.
 */

'use strict';

var util = require('../util');
var colors = util.colors;
var common = require('../common');
var debug = require('debug')('transport:js');

function jsParser(options){
  return common.createStream(options, 'js', parser);
}

var headerTpl = 'define("{{id}}", [{{deps}}], function(require, exports, module){';
var footerTpl = '});\n';

function parser(file, options){
  file.contents = new Buffer(transport(file, options));

  return file;
}

function transport(file, options){
  var id = common.transportId(file, options);
  var deps = common.transportDeps(file, options);

  debug('filepath ( %s )', colors.dataBold(file.path));
  debug('id ( %s )', colors.dataBold(id));
  debug('dependencies ( %s )', colors.dataBold(deps));

  return util.template(headerTpl, { id: id, deps: arr2str(deps) }) + '\n'
    + file.contents.toString() + '\n' + footerTpl;
}

function arr2str(arr){
  return arr.map(function (item){
    return '"' + item + '"';
  }).join(',');
}

/**
 * Exports module.
 */

module.exports = jsParser;
