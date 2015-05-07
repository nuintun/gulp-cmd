/**
 * Created by nuintun on 2015/4/28.
 */

'use strict';

var util = require('../util');
var colors = util.colors;
var common = require('../common');
var debug = require('debug')('transport:js');

// header and footer template string
var headerTpl = 'define("{{id}}", [{{deps}}], function(require, exports, module){';
var footerTpl = '});\n';

/**
 * parser
 * @param options
 * @returns {*}
 */

function parser(options){
  return common.createStream(options, 'js', transport);
}

/**
 * transport
 * @param file
 * @param options
 * @returns {string}
 */
function transport(file, options){
  var id = common.transportId(file, options);
  var deps = common.transportDeps(file, options);
  var code = util.template(headerTpl, { id: id, deps: util.arr2str(deps) })
    + '\n' + file.contents.toString() + '\n' + footerTpl;

  // debug
  debug('filepath ( %s )', colors.dataBold(file.path));
  debug('id ( %s )', colors.dataBold(id));
  debug('dependencies ( %s )', colors.dataBold(deps));

  file.contents = new Buffer(code);

  return file;
}

/**
 * Exports module.
 */

module.exports = parser;
