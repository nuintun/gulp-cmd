/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var fs = require('fs');
var File = require('vinyl');
var through = require('through2');
var util = require('../util');
var transport = require('./transport');
var debug = require('debug')('transport:include');

function include(options){
  return through.obj(function (file, enc, callback){
    if (file.isNull()) {
      // return empty file
      callback(null, file);
    }

    if (file.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    var self = this;
    var endFile = file.clone();

    getFiles(file, this, options);

    endFile.contents = null;

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
  var cwd = file.cwd;
  var base = file.base;
  var pkg = file.package;
  var include = options.include;

  if (Array.isArray(pkg.localDepsMaps)) {
    var files = pkg.localDepsMaps.filter(function (meta){
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