/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

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

    var startVinyl = vinyl.clone();
    var endVinyl = vinyl.clone();

    startVinyl.concatOpen = true;
    endVinyl.concatClose = true;
    endVinyl.contents = NULL;

    this.push(startVinyl);
    concat.call(this, vinyl, options);
    this.push(endVinyl);

    callback();
  });
}

function concat(vinyl, options){
  var stream = this;
  var pkg = vinyl.package;
  var include = options.include;

  function traverse(path){
    vinyl = vinylFile(path, vinyl);

    if (vinyl) {
      vinyl = transport(vinyl, options);

      concat.call(stream, vinyl, options);
      stream.push(vinyl);
    }
  }

  if (pkg && Array.isArray(pkg.localDepsMaps)) {
    pkg.localDepsMaps.forEach(function (meta){
      if (options.ignore.indexOf(meta.path) !== -1) {
        return false;
      }

      switch (include) {
        case 'all':
          return traverse(meta.path);
        case 'self':
          return false;
          break;
        case 'relative':
        default :
          return util.isRelative(meta.id) && traverse(meta.path);
      }
    });
  }
}

function vinylFile(path, vinyl){
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
}

/**
 * Exports module.
 */

module.exports = include;