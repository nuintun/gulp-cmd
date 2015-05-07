/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var common = require('../common');
var css2str = require('css2str');
var createStream = common.createStream;
var getStyleId = common.getStyleId;
var debug = require('debug')('transport:css2js');

function parser(options){
  return createStream(options, 'css', transport);
}

function transport(file, options){
  var code = 'require("import-style")("' + css2js(file, options) + '");\n';
  file.contents = new Buffer(code);
  file.path += '.js';
  return file;
}

function css2js(file, options){
  var opt;

  if (options.styleBox === true) {
    var styleId = getStyleId(file, options);
    var prefix = ['.', styleId, ' '].join('');

    debug('styleBox true, prefix: %s', prefix);

    opt = { prefix: prefix };
  }

  return css2str(file.contents, opt);
}

module.exports = parser;