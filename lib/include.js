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
var path = require('path');

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

    console.log(file.contents.toString());

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
  var input = fs.createReadStream(util.hideExt(path));

  var output = through.obj(function (file, encoding, callback){
    if (file.isNull()) {
      // return empty file
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    getFiles(file, options);

    basefile.contents = new Buffer(file.contents.toString() + basefile.contents.toString());

    this.push(file);

    callback();
  });

  input
    .pipe(vinyl(util.hideExt(path), basefile.base))
    .pipe(buffer())
    .pipe(transport(options))
    .pipe(output);
}

function vinyl(path, base){
  var ins = through();
  var out = false;

  var opts = {
    contents: ins
  };

  if (path) opts.path = path;
  if (base) opts.base = base;

  var file = new File(opts);

  return through({
    objectMode: true
  }, function (chunk, enc, next){
    if (!out) {
      this.push(file);
      out = true;
    }

    ins.push(chunk);
    next();
  }, function (){
    ins.push(null);
    this.push(null);
  })
}

// Consts
function buffer(){
  return through.obj(function (file, enc, callback){
    // keep null files as-is
    if (file.isNull()) {
      this.push(file);
      return callback();
    }

    // keep buffer files as-is
    if (file.isBuffer()) {
      this.push(file);
      return callback();
    }

    // transform stream files into buffer
    if (file.isStream()) {
      var self = this;
      var c_stream = file.contents;
      var chunks = [];
      var onreadable = function (){
        var chunk;
        while (null !== (chunk = c_stream.read())) {
          chunks.push(chunk);
        }
      };
      c_stream.on('readable', onreadable);
      c_stream.once('end', function (){
        c_stream.removeListener('readable', onreadable);
        file.contents = Buffer.concat(chunks);
        self.push(file);
        callback();
      });
    }
  });
}

module.exports = include;