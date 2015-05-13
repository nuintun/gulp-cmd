/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');

function transport(vinyl, options){
  var code = vinyl
    .contents
    .toString()
    .replace(/\n|\r/g, '')
    .replace(/'/g, '\\\'');
  var id = common.transportId(vinyl, options);

  code = "module.exports = '" + code + "';";

  vinyl.contents = new Buffer(util.wrapModule(id, [], code));

  return vinyl;
}

/**
 * Exports module.
 */

module.exports = util.plugin('html', transport);
