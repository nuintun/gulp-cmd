/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');

function transport(vinyl, options){
  var id = common.transportId(vinyl, options);
  var code = 'module.exports = ' + JSON.stringify(vinyl.contents.toString()) + ';';

  vinyl.contents = new Buffer(util.wrapModule(id, [], code));

  return vinyl;
}

/**
 * exports module.
 */
module.exports = util.plugin('tpl', transport);
