/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
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
  id = rename.parse(id);
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

  // rewrite relative
  file.path = join(file.base, util.addExt(id));
  // set file package info
  file.package = util.extend(file.package, { id: id }, pkg);

  return id;
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

  // replace require and collect dependencies
  file.contents = new Buffer(udeps(file.contents.toString(), function (id, flag){
    var path;
    var query;
    var normalizeId;
    var last = id.length - 1;
    var charCode = id.charCodeAt(last);
    var renameOpts = util.getRenameOpts(options.rename);
    var isRelative = util.isRelative(id);

    // parse id form alias, paths, vars
    id = util.parseAlias(id, alias);
    id = util.parsePaths(id, paths);
    id = util.parseAlias(id, alias);
    id = util.parseVars(id, vars);
    id = util.parseAlias(id, alias);

    // if the uri ends with `#`, just return it without '#'
    if (charCode === 35 /* "#" */) {
      normalizeId = id.substring(0, last);
    } else
    // if the uri not ends with `/' '.js' or not has '?', just return it with '.js'
    if (id.substring(last - 2) !== '.js' && id.indexOf('?') === -1 /* "?" */ && charCode !== 47 /* "/" */) {
      normalizeId = id + '.js';
    }

    // parse id form alias
    if (alias && is.string(alias[normalizeId])) {
      id = util.parseAlias(normalizeId, alias);
    }

    // debug
    debug('transport%s dependencies ( %s )', flag ? ' ' + flag : '', colors.dataBold(id));

    // get file path form id
    path = util.filepath(id);
    // get search string
    query = id.substr(path.length);

    // rename id
    id = rename.parse(path);
    id = (isRelative ? './' : '') + util.slashPath(rename(id, renameOpts));

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (extname(id) === '.css') {
      id += '.js';
    }

    id = id + query;

    // cache dependencie id and path
    if (flag === null) {
      // cache dependencie id
      deps.push(id);

      // get absolute path
      path = util.slashPath(join(file.base, util.resolve(path, file.package.id)));

      // cache dependencie absolute path
      depspath.push(path);
    }

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