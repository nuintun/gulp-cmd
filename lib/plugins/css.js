/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var css2str = require('../css2str');

function transport(vinyl, options){
  var id = common.transportId(vinyl, options);
  var deps = common.transportCssDeps(vinyl, options);

  // get code
  var code = '';

  // get code
  deps.forEach(function (id){
    code += "require('" + id + "');\n";
  });

  // push import-style module dependencies
  deps.push('import-style');

  // import import
  code += "require('import-import')('" + css2str(vinyl.contents, options) + "');";

  vinyl.contents = new Buffer(util.wrapModule(id, deps, code));

  return vinyl;
}

/**
 * Exports module.
 */

module.exports = common.createParser('css', transport);