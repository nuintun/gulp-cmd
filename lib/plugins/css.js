/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var path = require('path');
var util = require('../util');
var gutil = require('@nuintun/gulp-util');

var extname = path.extname;

/**
 * transport
 *
 * @param vinyl
 * @param options
 * @param next
 * @returns {void}
 */
module.exports = function(vinyl, options, next) {
  var id = util.transportId(vinyl, options);
  var deps = util.transportCssDeps(vinyl, options);

  // variable declaration
  var code = '';
  var importStylePath;
  var pkg = vinyl.package;
  var importStyle = util.parseAlias('import-style', options.alias);

  // debug
  util.debug('transport deps: %s', gutil.colors.magenta(importStyle));

  // add extname
  importStylePath = util.addExt(importStyle);
  // rename
  importStyle = util.rename(importStylePath, options.rename);
  // hide extname
  importStyle = util.hideExt(importStyle);

  // normalize id
  importStyle = gutil.normalize(importStyle);

  // import import-style lib
  code += 'var style = require(' + JSON.stringify(importStyle) + ');\n\n';

  // add require css
  deps = deps.filter(function(id) {
    if (gutil.isLocal(id)) {
      code += 'require(' + JSON.stringify(id) + ');\n';

      return true;
    } else {
      code += 'style.link("@import ' + JSON.stringify(id) + ';");\n';

      return false;
    }
  });

  // add import style dependencies
  deps.unshift(importStyle);
  pkg.dependencies.unshift(importStyle);
  // add include
  pkg.include.unshift({
    id: importStyle,
    path: util.resolve(importStylePath, vinyl, options.wwwroot)
  });

  // import style
  if (vinyl.contents.length) {
    code += 'style.css(' + JSON.stringify(vinyl.contents.toString()) + ');';
  }

  vinyl.contents = new Buffer(util.wrapModule(id, deps, code));

  next(null, vinyl);
};
