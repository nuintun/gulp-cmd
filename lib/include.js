/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var fs = require('fs');
var Vinyl = require('vinyl');
var through = require('through2');
var util = require('./util');
var colors = util.colors;
var transport = require('./transport');
var debug = util.debug;

// empty buffer
var NULL = new Buffer('');

function include(options){
  return through.obj(function (vinyl, encoding, callback){
    if (vinyl.isNull()) {
      // return empty file
      return callback(null, vinyl);
    }

    if (vinyl.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    vinyl = transport(vinyl, options);

    var included = [];
    var startVinyl = vinyl.clone();
    var endVinyl = vinyl.clone();

    startVinyl.concatOpen = true;
    endVinyl.concatClose = true;
    endVinyl.contents = NULL;

    this.push(startVinyl);
    included.push(startVinyl.path);
    includeDeps.call(this, vinyl, options, included);
    this.push(endVinyl);

    callback();
  });
}

/**
 * include dependencies file
 * @param vinyl
 * @param options
 * @param included
 */

function includeDeps(vinyl, options, included){
  var stream = this;
  var pkg = vinyl.package;
  var include = options.include;

  // traverse
  function traverse(path, base){
    included.push(path);

    var vinyl = vinylFile(path, base);

    if (vinyl !== null) {
      vinyl = transport(vinyl, options);

      includeDeps.call(stream, vinyl, options, included);
      stream.push(vinyl);
    }
  }

  if (pkg && Array.isArray(pkg.localDepsMaps)) {
    pkg.localDepsMaps.forEach(function (meta){
      // ignore or included
      if (options.ignore.indexOf(meta.path) !== -1 || included.indexOf(meta.path) !== -1) {
        return false;
      }

      include = 'all';
      switch (include) {
        case 'all':
          traverse(meta.path, vinyl);
          break;
        case 'self':
          break;
        case 'relative':
        default :
          if (util.isRelative(meta.id)) {
            traverse(meta.path, vinyl);
          }

          break;
      }
    });
  }
}

/**
 * create a new vinyl file
 * @param path
 * @param vinyl
 * @returns {*}
 */

function vinylFile(path, vinyl){
  if (!is.string(path) || !vinyl) return null;

  if (!fs.existsSync(path)) {
    path = util.hideExt(path);
  }

  if (fs.existsSync(path)) {
    return new Vinyl({
      path: path,
      cwd: vinyl.cwd,
      base: vinyl.base,
      stat: fs.statSync(path),
      contents: fs.readFileSync(path)
    });
  }

  debug('file: %s not exists', colors.warn(path));

  return null;
}

/**
 * Exports module.
 */

module.exports = include;