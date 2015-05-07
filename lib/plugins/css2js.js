/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var css2str = require('./css2str');
var debug = require('debug')('transport:css2js');

// header and footer template string
var headerTpl = 'define("{{id}}", [{{deps}}], function(require, exports, module){';
var footerTpl = '});\n';

function parser(options){
  return common.createStream(options, 'css', transport);
}

function transportDeps(file, options){
  var deps = ['import-style'];

  common.cssImports(file.contents.toString(), function (meta){
    console.log(meta);

    return '';
  });

  return deps;
}

function transport(file, options){
  var id = common.transportId(file, options);
  var code = "module.exports='" + css2js(file, options) + "';\n";

  file.contents = new Buffer(code);

  transportDeps(file, options);

  return file;
}

function css2js(file, options){
  //var opt;
  //
  //if (options.styleBox === true) {
  //  var styleId = getStyleId(file, options);
  //  var prefix = ['.', styleId, ' '].join('');
  //
  //  debug('styleBox true, prefix: %s', prefix);
  //
  //  opt = { prefix: prefix };
  //}

  return css2str(file.contents, options);
}

module.exports = parser;