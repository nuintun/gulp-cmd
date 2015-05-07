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

function transport(file, options){
  var id = common.transportId(file, options);
  var deps = common.transportCssDeps(file, options);
  var code = util.template(headerTpl, { id: id, deps: util.arr2str(deps) });

  console.log(id);

  deps.forEach(function (id){
    code += 'require("' + id + '")';
  });

  code += "module.exports='" + css2js(file, options) + "';\n" + footerTpl;

  file.contents = new Buffer(code);

  console.log(code);

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