/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var fs = require('fs');
var File = require('vinyl');
var through = require('through2');
var util = require('./util');
var transport = require('./transport');
var debug = require('debug')('transport:include');

function include(options){
  return through.obj(function (file, encoding, callback){
    if (file.isNull()) {
      // return empty file
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    var self = this;
    var endFile = file.clone();

    endFile.contents = null;

    getFiles(file, this, options);

    // file self
    debug('filepath: %s self', file.path);
    this.push(file);
    // end file
    debug('filepath: %s end', endFile.path);

    this.push(endFile);

    callback();
  });
}

function getFiles(file, options){
  var cwd = file.cwd;
  var base = file.base;
  var pkg = file.package;
  var include = options.include;
  var stream = through.obj();

  if (pkg && Array.isArray(pkg.localDepsMaps)) {
    var files = [];

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

    // file dependency
    files.forEach(function (path){
      stream = createFile(path, cwd, base, options).pipe(stream);
    });
  }

  return stream;
}

function createFile(path, cwd, base, options){
  var stream = through.obj(function (file, enc, callback){
    var f = new File({
      cwd: cwd,
      base: base,
      path: path,
      contents: fs.readFileSync(path)
    });

    this.push(f);

    console.log(f);

    callback();
  });

  return stream
    .pipe(transport(options))
    .pipe(include(options));
}

module.exports = include;