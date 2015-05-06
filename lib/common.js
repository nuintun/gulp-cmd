/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var path = require('path');
var join = path.join;
var extname = path.extname;
var through = require('through2');
var rename = require('rename');
var udeps = require('umd-deps');
//var File = require('father').File;
var debug = require('debug')('transport:common');
var util = require('./util');
var extend = util.extend;
var template = util.template;
var extendOption = util.extendOption;
var hideExt = util.hideExt;
var addExt = util.addExt;
var slashPath = util.slashPath;
var throwError = util.throwError;
var parsePackage = util.parsePackage;

/**
 * Transport cmd id
 * - file: file object of father
 * - required options: idleading, rename
 */

function transportId(file, options){
  options = extendOption(options);

  var pkg = parsePackage(file);
  var idleading = resolveIdleading(options.idleading, file.path, pkg);
  var id = template(idleading, pkg);
  var renameOpts = util.getRenameOpts(options.rename);

  // rename id
  id = rename.parse(addExt(id));
  id = rename(id, renameOpts);
  id = slashPath(hideExt(id));

  // seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (extname(id) === '.css') {
    id += '.js';
  }

  debug('transport id(%s)', id);

  // Rewrite relative
  file.path = join(file.base, addExt(id));
  // Set file package info
  file.package = extend(file.package, { id: id }, pkg);

  return id;
}

/**
 * Transport cmd dependencies, it will get deep dependencies of the file,
 * but will ignore relative module of the dependent package.
 * - file: file object of father
 * - required options: idleading, rename, ignore
 */

function transportDeps(file, options){
  options = extendOption(options);

  var deps = [];
  var alias = options.alias;
  var RELATIVE_RE = /^\.{1,2}[\\/]/;

  // Replace require
  file.contents = new Buffer(udeps(file.contents.toString(), function (path, flag){
    if (!RELATIVE_RE.test(path) && alias[path]) {
      path = alias[path];
    }

    path = rename(path, util.getRenameOpts(options.rename));
    path = slashPath(hideExt(path));

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (extname(path) === '.css') {
      path += '.js';
    }

    // Cache dependencie
    if (flag === null) {
      deps.push(path);
      debug('found dependencie(%s)', path);
    }

    return path;
  }, true));

  // Cache file dependencies
  file.package = extend(file.package, { dependencies: deps });

  console.log(JSON.stringify(file.package, null, 2));

  return deps;
}

/*
 Create a stream for parser in lib/parser
 */

function createStream(options, type, parser){
  options = extendOption(options);

  return through.obj(function (gfile, enc, callback){
    if (gfile.isNull()) {
      debug('transport ignore filepath:%s cause null', gfile.path);

      return callback(null, gfile);
    }

    if (gfile.isStream()) {
      return callback(new Error('Streaming not supported.'));
    }

    var ext = extname(gfile.path).substring(1);

    if (type && ext !== type) {
      return callback(new Error('extension "' + ext + '" not supported.'));
    }

    try {
      debug('transport %s / filepath:%s', type, gfile.path);

      gfile = parser.call(this, gfile, options);
    } catch (e) {
      return callback(e);
    }

    this.push(gfile);

    return callback();
  });
}

function isFunction(fun){
  return Object.prototype.toString.call(fun) === '[object Function]';
}

function resolveIdleading(idleading, filepath, pkg){
  return isFunction(idleading) ? idleading(filepath, pkg) : idleading;
}

/*
 Exports
 */

exports.transportId = transportId;
exports.transportDeps = transportDeps;
exports.createStream = createStream;
exports.resolveIdleading = resolveIdleading;