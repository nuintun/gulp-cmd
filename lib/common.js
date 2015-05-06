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
var debug = require('debug')('transport:common');
var util = require('./util');
var colors = util.colors;

/**
 * Transport cmd id
 * - file: file object of father
 * - required options: idleading, rename
 */

function transportId(file, options){
  var pkg = util.parsePackage(file);
  var idleading = resolveIdleading(options.idleading, file.path, pkg);
  var id = util.template(idleading, pkg);
  var renameOpts = util.getRenameOpts(options.rename);

  // rename id
  id = rename.parse(util.addExt(id));
  id = rename(id, renameOpts);
  id = util.slashPath(util.hideExt(id));

  // seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (extname(id) === '.css') {
    id += '.js';
  }

  // debug
  debug('transport id ( %s )', colors.dataBold(id));

  // Rewrite relative
  file.path = join(file.base, util.addExt(id));
  // Set file package info
  file.package = util.extend(file.package, { id: id }, pkg);

  return id;
}

// Normalize an id
// normalize("path/to/a") ==> "path/to/a.js"
// NOTICE: substring is faster than negative slice and RegExp
function normalize(id){
  var last = id.length - 1;
  var charCode = id.charCodeAt(last);

  // If the uri ends with `#`, just return it without '#'
  if (charCode === 35 /* "#" */) {
    return id.substring(0, last);
  }

  return (id.substring(last - 2) === '.js'
  || id.indexOf('?') > 0 /* "?" */
  || charCode === 47 /* "/" */) ? id : id + '.js';
}

/**
 * Transport cmd dependencies, it will get deep dependencies of the file,
 * but will ignore relative module of the dependent package.
 * - file: file object of father
 * - required options: idleading, rename, ignore
 */

function transportDeps(file, options){
  var deps = [];
  var depspath = [];
  var alias = options.alias;
  var paths = options.paths;
  var vars = options.vars;

  // Replace require
  file.contents = new Buffer(udeps(file.contents.toString(), function (id, flag){
    var path;
    var query;
    var renameOpts = util.getRenameOpts(options.rename);

    id = util.parseAlias(id, alias);
    id = util.parsePaths(id, paths);
    id = util.parseAlias(id, alias);
    id = util.parseVars(id, vars);
    id = util.parseAlias(id, alias);
    id = normalize(id);
    id = util.parseAlias(id, alias);

    path = util.filepath(id);
    query = id.substring(path.length);

    path = rename.parse(util.addExt(path));
    path = (path.dirname === '.' ? './' : '') + rename(path, renameOpts);
    path = util.slashPath(util.hideExt(path));

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (extname(path) === '.css') {
      path += '.js';
    }

    // add query
    id = path + query;

    // Cache dependencie id and path
    if (flag === null) {
      deps.push(id);

      path = util.addExt(join(file.base, util.resolve(path, file.package.id)));

      depspath.push(path);
    }

    // debug
    debug('transport %s dependencie ( %s )', flag || 'require', colors.dataBold(id));

    return id;
  }, true));

  // Cache file dependencies
  file.package = util.extend(file.package, { dependencies: deps, dependenciespath: depspath });

  return deps;
}

/*
 Create a stream for parser in lib/parser
 */

function createStream(options, type, parser){
  options = util.extendOption(options);

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