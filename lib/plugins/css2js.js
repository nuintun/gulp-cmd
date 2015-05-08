/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var css2str = require('../css2str');
var debug = require('debug')('transport:css2js');

function parser(options){
  return common.createStream(options, 'css', transport);
}

function transport(file, options){
  var id = common.transportId(file, options, true);
  var deps = common.transportCssDeps(file, options, true);

  // get code
  var code = '';

  // get code
  deps.forEach(function (id){
    code += "require('" + id + "');\n";
  });

  // push import-style module dependencies
  deps.push('import-style');

  // import import
  code += "require('import-import')('" + css2str(file.contents, options) + "');";

  file.contents = new Buffer(util.wrapModule(id, deps, code));

  // debug
  debug(util.colors.infoBold('transport css.js file ok'));

  return file;
}

module.exports = parser;