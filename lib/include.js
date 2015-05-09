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

    getFiles(file, options);

    //console.log(file.contents.toString());

    this.push(file);

    callback();
  });
}

function getFiles(file, options){
  var files = [];
  var pkg = file.package;
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

    // file dependency
    files.forEach(function (path){
      createFile(path, file, options);
    });
  }

  return files;
}

function createFile(path, basefile, options){
  var input = through.obj(function (file, encoding, callback){
    this.push(new File({
      cwd: basefile.cwd,
      base: basefile.base,
      path: path,
      contents: fs.readFileSync(util.hideExt(path))
    }));

    callback();
  });

  var output = through.obj(function (file, encoding, callback){
    if (file.isNull()) {
      // return empty file
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    console.log(file.contents.toString());

    getFiles(file, options);

    basefile.contents = new Buffer(file.contents.toString() + basefile.contents.toString());

    this.push(file);

    callback();
  });

  input
    .pipe(transport(options))
    .pipe(output);
}

module.exports = include;