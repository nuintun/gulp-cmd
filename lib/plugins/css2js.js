/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var css2str = require('../css2str');
var debug = require('debug')('transport:css2js');

// header and footer template string
var headerTpl = 'define("{{id}}", [{{deps}}], function(require, exports, module){';
var footerTpl = '});\n';

function parser(options){
  return common.createStream(options, 'css', transport);
}

function transport(file, options){
  var id = common.transportId(file, options, true);
  var deps = common.transportCssDeps(file, options, true);

  // push import-style module dependencies
  deps.push('import-style');

  // get code
  var code = '';

  deps.forEach(function (id){
    if (id === 'import-style') {
      code += "require('import-style')('" + css2js(file, options) + "');\n" + footerTpl;
    } else {
      code += "require('" + id + "');\n";
    }
  });

  file.contents = new Buffer(util.wrapModule(id, deps, code));

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