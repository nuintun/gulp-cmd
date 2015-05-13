/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var css = require('css');
var path = require('path');
var join = path.join;
var extname = path.extname;
var rename = require('./rename');
var udeps = require('umd-deps');
var cdeps = require('./css-deps');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;

/**
 * Transport vinyl id
 * - vinyl: vinyl object
 * - required options: idleading, rename
 */

function transportId(vinyl, options){
  var id;
  var pkg = util.parsePackage(vinyl, options.wwwroot);
  var idleading = resolveIdleading(options.idleading, vinyl.path, pkg);

  // get id
  id = util.template(idleading, pkg);
  // rename id
  id = util.addExt(id);
  id = rename(id, options.rename);
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
  debug('transport id: %s', colors.data(id));

  // rewrite vinyl path
  if (path.isAbsolute(id)) {
    vinyl.path = join(options.wwwroot, util.addExt(id));
  } else {
    vinyl.path = join(vinyl.cwd, vinyl.base, util.addExt(id));
  }

  // set vinyl package info
  vinyl.package = util.extend(pkg, { id: id });

  return id;
}

/**
 * Transport cmd dependencies.
 * - vinyl: vinyl object
 * - required options: idleading
 */

function transportDeps(vinyl, options){
  var deps = [];
  var include = [];
  var vars = options.vars;
  var alias = options.alias;
  var paths = options.paths;
  var pkg = vinyl.package || {};

  // replace require and collect dependencies
  vinyl.contents = new Buffer(udeps(vinyl.contents.toString(), function (id, flag){
    // parse id form alias, paths, vars
    id = util.parseAlias(id, alias);
    id = util.parsePaths(id, paths);
    id = util.parseAlias(id, alias);
    id = util.parseVars(id, vars);
    id = util.parseAlias(id, alias);

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);

      return id;
    }

    var path;

    // normalize id
    id = util.normalize(id);

    // if end with /, find index file
    if (id.substring(id.length - 1) === '/') {
      id += 'index';
    }

    // debug
    debug('transport%s deps: %s', flag ? ' ' + flag : '', colors.data(id));

    // add extname
    path = util.addExt(id);
    // rename id
    id = rename(path, options.rename);
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
      path = util.resolve(path, vinyl, options.wwwroot);

      // cache dependencie absolute path
      include.push({
        id: id,
        path: path
      });
    }

    return id;
  }, true));

  // Cache file dependencies
  vinyl.package = util.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * Transport css dependencies.
 * - vinyl: vinyl object
 */

function transportCssDeps(vinyl, options){
  var deps = [];
  var include = [];
  var prefix = options.prefix;
  var pkg = vinyl.package || {};

  // compute prefix
  prefix = is.fn(prefix) ? prefix(pkg.id || null, vinyl.path) : prefix;

  // replace imports and collect dependencies
  vinyl.contents = new Buffer(cdeps(vinyl.contents, function (id){
    var path;

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);

      // keep import
      return id;
    }

    // normalize id
    id = util.normalize(id);

    var isRelative = util.isRelative(id);
    var isAbsolute = util.isAbsolute(id);

    // css import parsing rules using html
    if (!isAbsolute && !isRelative) {
      id = './' + id;
    }

    // if end with /, find index file
    if (id.substring(id.length - 1) === '/') {
      id += 'index.css';
    }

    // add extname
    path = util.addExt(id);
    // rename id
    id = rename(path, options.rename);
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
    debug('transport deps: %s', colors.data(id));

    // get absolute path
    path = util.resolve(path, vinyl, options.wwwroot);

    // cache dependencie id
    deps.push(id);
    // cache dependencie absolute path
    include.push({
      id: id,
      path: path
    });

    // delete all import
    return false;
  }, options.oncsspath, prefix));

  // Cache file dependencies
  vinyl.package = util.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/*
 Create a parser in lib/parser
 */

function createParser(type, transport){
  return function (vinyl, options){
    // debug
    debug('read %s: %s', type, colors.data(util.pathFromCwd(vinyl.path)));

    vinyl = transport(vinyl, options);

    return vinyl;
  };
}

/**
 * resolve id leading
 * @param idleading
 * @param path
 * @param pkg
 * @returns {*}
 */

function resolveIdleading(idleading, path, pkg){
  return is.fn(idleading) ? idleading(path, pkg) : idleading;
}

/**
 * Exports module.
 */

exports.transportId = transportId;
exports.transportDeps = transportDeps;
exports.createParser = createParser;
exports.resolveIdleading = resolveIdleading;
exports.transportCssDeps = transportCssDeps;
