/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var fs = require('fs');
var Vinyl = require('vinyl');
var through = require('through2');
var util = require('./util');
var transport = require('./transport');
var debug = require('debug')('transport:include');

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

    console.log(vinyl.contents.toString());

    this.push(vinyl);

    callback();
  });
}

function getFiles(vinyl, options){
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
      createFile(path, vinyl, options);
    });
  }

  return files;
}

function createFile(path, vinyl, options){
  var input = fs.createReadStream(util.hideExt(path));

  var output = through.obj(function (vinyl, encoding, callback){
    if (vinyl.isNull()) {
      // return empty vinyl
      return callback(null, vinyl);
    }

    if (vinyl.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    this.push(vinyl);

    callback();
  });

  return input
    .pipe(vinyl(util.hideExt(path), basefile.base))
    .pipe(buffer())
    .pipe(transport(options))
    .pipe(output);
}

module.exports = include;