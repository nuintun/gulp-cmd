/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var path = require('path');
var extname = path.extname;
var util = require('../util');
var debug = util.debug;
var colors = util.colors;
var rename = require('../rename');
var common = require('../common');

function transport(vinyl, options){
  var id = common.transportId(vinyl, options);
  var deps = common.transportCssDeps(vinyl, options);

  // variable declaration
  var code = '';
  var importStylePath;
  var importStyle = util.parseAlias('import-style', options.alias);

  // debug
  debug('transport deps: %s', colors.magenta(importStyle));

  // add extname
  importStylePath = util.addExt(importStyle);
  // rename
  importStyle = rename(importStylePath, options.rename);
  // hide extname
  importStyle = util.hideExt(importStyle);

  // seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (extname(importStyle) === '.css') {
    id += '.js';
  }

  // normalize id
  importStyle = util.normalize(importStyle);

  // add import style dependencies
  vinyl.package.dependencies.push(importStyle);
  // add include
  vinyl.package.include.push({
    id: importStyle,
    path: util.resolve(importStylePath, vinyl, options.wwwroot)
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
