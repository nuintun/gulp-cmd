/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var fs = require('fs');
var Vinyl = require('vinyl');
var through = require('through2');
var util = require('./util');
var transport = require('./transport');
var debug = util.debug;

function include(options){
  options = util.extendOption(options);

  return through.obj(function (vinyl, encoding, callback){
    if (vinyl.isNull()) {
      // return empty file
      return callback(null, vinyl);
    }

    if (vinyl.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    vinyl = transport(vinyl, options);

    var endVinyl = vinyl.clone();

    vinyl.concatStart = vinyl.path;
    endVinyl.concatEnd = vinyl.path;
    endVinyl.contents = null;

    this.push(vinyl);
    concat.call(this, vinyl, options);
    this.push(endVinyl);

    callback();
  });
}

function concat(vinyl, options){
  var stream = this;
  var files = [];
  var pkg = vinyl.package;
  var include = options.include;

  if (pkg && Array.isArray(pkg.localDepsMaps)) {
    pkg.localDepsMaps.forEach(function (meta){
      if (options.ignore.indexOf(meta.path) !== -1) {
        return false;
      }

      switch (include) {
        case 'all':
          return files.push(meta.path);
        case 'self':
          return false;
          break;
        case 'relative':
        default :
          return util.isRelative(meta.id) && files.push(meta.path);
      }
    });

    // vinyl dependency
    files.forEach(function (path){
      vinyl = transport(vinylFile(path, vinyl), options);

      concat.call(stream, vinyl, options);

      stream.push(vinyl);
    });
  }

  return files;
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
      contents: fs.readFileSync(path)
    });
  }

  debug('file: %s not exists', path);
}

module.exports = include;