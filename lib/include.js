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

function getFiles(file, stream, options){
  var files = [];
  var cwd = file.cwd;
  var base = file.base;
  var pkg = file.package;
  var include = options.include;

  if (pkg && Array.isArray(pkg.localDepsMaps)) {
    files = pkg.localDepsMaps.filter(function (meta){
      if (options.ignore.indexOf(meta.path)) {
        return false;
      }

      switch (include) {
        case 'all':
          return true;
        case 'self':
          return false;
          break;
        case 'relative':
        default :
          return util.isRelative(meta.id);
      }
    });

    // file dependency
    files.forEach(function (path){
      createFile(path, cwd, base, options).pipe(stream);
    });
  }

  return files;
}

function createFile(path, cwd, base, options){
  var stream = through.obj(function (file, enc, callback){
    this.push(new File({
      cwd: cwd,
      base: base,
      path: path,
      contents: fs.readFileSync(path)
    }));

    callback();
  });

  stream
    .pipe(transport(options))
    .pipe(include(options));

  return stream;
}

module.exports = include;