/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');
var rename = require('../rename');
var common = require('../common');

function transport(vinyl, options){
  var id = common.transportId(vinyl, options);
  var deps = common.transportCssDeps(vinyl, options);

  // variable declaration
  var path;
  var code = '';
  var importStyle = util.parseAlias('import-style', options.alias);

  // debug
  debug('transport deps: %s', colors.magenta(importStyle));

  // add extname
  importStyle = util.addExt(importStyle);
  importStyle = rename(importStyle, options.rename);
  path = util.resolve(importStyle, vinyl, options.wwwroot);
  importStyle = util.hideExt(importStyle);

  // add import style dependencies
  vinyl.package.dependencies.push(importStyle);
  // add include
  vinyl.package.include.push({
    id: importStyle,
    path: path
  });

  // add require css
  deps.forEach(function (id){
    code += "require('" + id.replace(/'/g, '\\\'') + "');\n";
  });

  // import style
  code += "require('" + importStyle.replace(/'/g, '\\\'') + "')('"
    + vinyl.contents.toString()
      .replace(/\\/g, '\\\\') // replace ie hack: https://github.com/spmjs/spm/issues/651
      .replace(/'/g, '\\\'')
    + "');";

  vinyl.contents = new Buffer(util.wrapModule(id, deps, code));

  return vinyl;
}

/**
 * Exports module.
 */

module.exports = util.plugin('css', transport);
