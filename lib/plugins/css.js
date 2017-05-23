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
  var code = '';
  var id = util.transportId(vinyl, options);
  var loaderId = util.parseAlias('css-loader', options.alias);

  // debug
  util.debug('module deps: %p', loaderId);

  // process css loader id and path
  if (gutil.isLocal(loaderId)) {
    var loader;

    // add extname
    loader = loaderId = util.addExt(loaderId);
    // rename
    loaderId = util.rename(loaderId, options.rename);
    // hide extname
    loaderId = util.hideExt(loaderId);
    // normalize id
    loaderId = gutil.normalize(loaderId);
    // css loader path
    loader = util.resolve(loader, vinyl, options.wwwroot);
    // parse map
    loaderId = gutil.parseMap(loaderId, options.map);

    // add include
    vinyl.package.include.unshift({
      id: loaderId,
      path: loader
    });
  }

  // import css-loader lib
  code += 'var loader = require(' + JSON.stringify(loaderId) + ');\n\n';

  var deps = util.transportCssDeps(vinyl, options);

  // add require css
  deps = deps.filter(function(id) {
    if (gutil.isLocal(id)) {
      code += 'require(' + JSON.stringify(id) + ');\n';

      return true;
    }

    code += 'loader.link("@import ' + JSON.stringify(id) + ';");\n';

    return false;
  });

  // add css loader dependencies
  deps.unshift(loaderId);

  // insert css
  if (vinyl.contents.length) {
    code += 'loader.insert(' + JSON.stringify(vinyl.contents.toString()) + ');';
  }

  vinyl.contents = new Buffer(util.wrapModule(id, deps, code));

  next(null, vinyl);
};
