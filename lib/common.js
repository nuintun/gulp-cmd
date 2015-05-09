/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var css = require('css');
var path = require('path');
var join = path.join;
var extname = path.extname;
var through = require('through2');
var rename = require('rename');
var udeps = require('umd-deps');
var cdeps = require('./css-deps');
var debug = require('debug')('transport:common');
var util = require('./util');
var colors = util.colors;

/**
 * Transport file id
 * - file: file object
 * - required options: idleading, rename
 */

function transportId(file, options){
  var id;
  var pkg = util.parsePackage(file);
  var renameOpts = util.getRenameOpts(options.rename);
  var idleading = resolveIdleading(options.idleading, file.path, pkg);

  // get id
  id = util.template(idleading, pkg);
  // rename id
  id = rename.parse(util.addExt(id));
  id = rename(id, renameOpts);
  id = util.normalize(util.hideExt(id));

  // seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (extname(id) === '.css') {
    id += '.js';
  }

  // debug
  debug('transport id: %s', colors.dataBold(id));

  // rewrite file path
  file.path = join(file.cwd, file.base, util.addExt(id));
  // set file package info
  file.package = util.extend(file.package, { id: id }, pkg);

  return id;
}

/**
 * Transport cmd dependencies.
 * - file: file object
 * - required options: idleading
 */

function transportDeps(file, options){
  var deps = [];
  var localDepsMaps = [];
  var alias = options.alias;
  var paths = options.paths;
  var vars = options.vars;

  // replace require and collect dependencies
  file.contents = new Buffer(udeps(file.contents.toString(), function (id, flag){
    // normalize id
    id = util.normalize(id);

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);

      return id;
    }

    var path;
    var isRelative = util.isRelative(id);
    var renameOpts = util.getRenameOpts(options.rename);

    // parse id form alias, paths, vars
    id = util.parseAlias(id, alias);
    id = util.parsePaths(id, paths);
    id = util.parseAlias(id, alias);
    id = util.parseVars(id, vars);
    id = util.parseAlias(id, alias);

    // normalize id
    id = util.normalize(id);

    // if end with /, find index file
    if (id.substring(id.length - 1) === '/') {
      id += 'index';
    }

    // add extname
    path = util.addExt(id);

    // debug
    debug('transport%s dependencies: %s', flag ? ' ' + flag : '', colors.dataBold(id));

    // rename id
    id = rename.parse(path);
    id = (isRelative ? './' : '') + rename(id, renameOpts);

    // hide extname
    id = util.hideExt(id);

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (extname(id) === '.css') {
      id += '.js';
    }

    // normalize id
    id = util.normalize(id);

    // cache dependencie id and path
    if (flag === null) {
      // cache dependencie id
      deps.push(id);

      // get absolute path
      path = util.resolve(path, file, options.wwwroot);

      // cache dependencie absolute path
      localDepsMaps.push({
        id: id,
        path: path
      });
    }

    return id;
  }, true));

  // Cache file dependencies
  file.package = util.extend(file.package, {
    dependencies: deps,
    localDepsMaps: localDepsMaps
  });

  return deps;
}

/**
 * Transport css dependencies.
 * - file: file object
 */

function transportCssDeps(file, options){
  var deps = [];
  var localDepsMaps = [];

  // replace imports and collect dependencies
  file.contents = new Buffer(cdeps(file.contents, function (id){
    var path;

    // normalize id
    id = util.normalize(id);

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);

      return id;
    }

    var isRelative = util.isRelative(id);
    var isAbsolute = util.isAbsolute(id);
    var renameOpts = util.getRenameOpts(options.rename);

    if (!isAbsolute && !isRelative) {
      id = './' + id;
      isRelative = true;
    }

    // if end with /, find index file
    if (id.substring(id.length - 1) === '/') {
      id += 'index.css';
    }

    // add extname
    id = path = util.addExt(id);

    // rename path
    id = rename.parse(id);
    id = (isRelative ? './' : '') + util.normalize(rename(id, renameOpts));
    // hide extname
    id = util.hideExt(id);

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (extname(id) === '.css') {
      id += '.js';
    }

    // normalize id
    id = util.normalize(id);

    // debug
    debug('transport dependencies: %s', colors.dataBold(id));

    // get absolute path
    path = util.resolve(path, file, options.wwwroot);

    // cache dependencie id
    deps.push(id);
    // cache dependencie absolute path
    localDepsMaps.push({
      id: id,
      path: path
    });

    // delete all import
    return false;
  }, options.oncsspath));

  // Cache file dependencies
  file.package = util.extend(file.package, {
    dependencies: deps,
    localDepsMaps: localDepsMaps
  });

  return deps;
}

/*
 Create a stream for parser in lib/parser
 */

function createStream(options, type, parser){
  return through.obj(function (file, enc, callback){
    if (file.isNull()) {
      // return empty file
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    var ext = extname(file.path).substring(1);

    if (type && ext !== type) {
      return callback(util.throwError('extension %s not supported.', ext));
    }

    try {
      // debug
      debug('transport %s: %s', type, colors.dataBold(util.normalize(file.path)));

      file = parser.call(this, file, options);
    } catch (e) {
      return callback(e);
    }

    this.push(file);

    return callback();
  });
}

/**
 * resolve id leading
 * @param idleading
 * @param filepath
 * @param pkg
 * @returns {*}
 */

function resolveIdleading(idleading, filepath, pkg){
  return is.fn(idleading) ? idleading(filepath, pkg) : idleading;
}

/**
 * Exports module.
 */

exports.transportId = transportId;
exports.transportDeps = transportDeps;
exports.createStream = createStream;
exports.resolveIdleading = resolveIdleading;
exports.transportCssDeps = transportCssDeps;