/**
 * Created by nuintun on 2015/4/28.
 */

'use strict';

var is = require('is');
var util = require('../util');
var common = require('../common');
var debug = require('debug')('transport:css');

function parser(options){
  return common.createStream(options, 'css', transport);
}

function transport(file, options){
  if (!options.css2js) {
    common.transportId(file, options);
    common.transportCssDeps(file, options);
  }

  // process css resource
  var code = common.cssPaths(file.contents, function (item){
    var string = item.string;

    if (is.fn(options.onCSSPaths)) {
      string = options.onCSSPaths(item, file);
      string = is.string(string) ? string : item.string;
    }

    return string;
  });

  file.contents = new Buffer(code);

  // debug
  debug(util.colors.infoBold('transport css file ok'));

  return file;
}

module.exports = parser;