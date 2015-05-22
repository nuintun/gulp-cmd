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
  var imports = '';
  var importStylePath;
  var pkg = vinyl.package;
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

  // import import-style lib
  code += "var importStyle = require(" + JSON.stringify(importStyle) + ");";

  // add require css
  deps = deps.filter(function (id){
    if (util.isLocal(id)) {
      code += 'require(' + JSON.stringify(id) + ');\n';

      return true;
    } else {
      code += 'importStyle.imports(' + JSON.stringify('@import ' + JSON.stringify(uri) + ';') + ');\n';

      return false;
    }
  });

  // remote uri
  pkg.dependencies.forEach(function (uri){
    // compile remote uri
    imports += '@import ' + JSON.stringify(uri) + ';';
  });

  // add import style dependencies
  pkg.dependencies.push(importStyle);
  // add include
  pkg.include.push({
    id: importStyle,
    path: util.resolve(importStylePath, vinyl, options.wwwroot)
  });

  // import style
  code += "importStyle.cssText('"
    + vinyl.contents.toString()
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\\\'')
    + "');";

  vinyl.contents = new Buffer(util.wrapModule(id, deps, code));

  return vinyl;
}

/**
 * Exports module.
 */

module.exports = util.plugin('css', transport);
