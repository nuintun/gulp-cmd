/*!
 * plugins/css
 * Version: 0.0.1
 * Date: 2017/07/11
 * https://github.com/nuintun/gulp-cmd
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-cmd/blob/master/LICENSE
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
 * @returns {void}
 */
module.exports = function(vinyl, options) {
  return new Promise(function(resolve) {
    var code = '';
    var id = util.transportId(vinyl, options);
    var deps = util.transportCssDeps(vinyl, options);
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

    resolve(vinyl);
  });
};
