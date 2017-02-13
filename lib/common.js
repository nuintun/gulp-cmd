/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var path = require('path');
var join = path.join;
var extname = path.extname;
var rename = require('./rename');
var cmd = require('cmd-deps');
var css = require('@nuintun/css-deps');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;
var initPlugins = require('./plugins/');

/**
 * get rename options
 * @param transform
 * @returns {object}
 */
function initRenameOptions(transform) {
  if (is.fn(transform)) {
    return transform;
  }

  transform = transform || {};

  if (transform.min) {
    transform.suffix = '-min';
  }

  if (transform.debug) {
    transform.suffix = '-debug';
  }

  return transform;
}

/**
 * init options
 * @param options
 * @returns {object}
 */
function initOptions(options) {
  var defaults = {
    css: {}, // { prefix: null, onpath: null }
    map: {}, // the map
    vars: {}, // the vars
    paths: {}, // the paths
    alias: {}, // the alias
    cache: true, // use memory file cahe
    ignore: [], // omit the given dependencies when include
    wwwroot: '', // web root
    rename: null, // { debug: boolean, min: boolean }
    plugins: null, // file trnasport plugins
    include: 'relative', // include model: self, relative, all
    idleading: '{{name}}/{{version}}/{{file}}' // the id prefix template
  };

  // mix
  util.extend(true, defaults, options);

  // wwwroot must be string
  if (!is.string(defaults.wwwroot)) {
    util.throwError('options.wwwroot\'s value should be string.');
  }

  // init wwwroot
  defaults.wwwroot = join(util.cwd, defaults.wwwroot);
  // init plugins
  defaults.plugins = initPlugins(defaults.plugins);
  // init css settings
  defaults.css = defaults.css || {};
  // init rename
  defaults.rename = initRenameOptions(defaults.rename);
  // init ignore
  defaults.ignore = Array.isArray(defaults.ignore) ? defaults.ignore : [];
  // init js settings
  defaults.js = defaults.js || {};
  // init js flags
  if (!defaults.js.hasOwnProperty('flags')) {
    defaults.js.flags = ['async'];
  }

  return defaults;
}

/**
 * resolve id leading
 * @param idleading
 * @param path
 * @param pkg
 * @returns {string}
 */
function resolveIdleading(idleading, path, pkg) {
  return is.fn(idleading) ? idleading(path, pkg) : idleading;
}

/**
 * transport vinyl id
 * @param vinyl
 * @param options
 * @returns {string}
 */
function transportId(vinyl, options) {
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
  id = id.replace(/^\.\//, '');
  id = id.replace(/^\/\//, '/');

  // debug
  debug('transport id: %s', colors.magenta(id));

  // rewrite vinyl path
  if (util.isAbsolute(id)) {
    vinyl.path = join(options.wwwroot, util.addExt(id));
  } else {
    vinyl.path = join(vinyl.cwd, vinyl.base, util.addExt(id));
  }

  // parse map
  id = util.parseMap(id, options.map);

  // set vinyl package info
  vinyl.package = util.extend(pkg, { id: id });

  return id;
}

/**
 * transport cmd dependencies.
 * @param vinyl
 * @param options
 * @returns {object}
 */
function transportDeps(vinyl, options) {
  var deps = [];
  var include = [];
  var vars = options.vars;
  var alias = options.alias;
  var paths = options.paths;
  var pkg = vinyl.package || {};

  // replace require and collect dependencies
  vinyl.contents = new Buffer(cmd(vinyl.contents.toString(), function(id, flag) {
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
    } else {
      var path;

      // normalize id
      id = util.normalize(id);

      // if end with /, find index file
      if (id.substring(id.length - 1) === '/') {
        id += 'index';
      }

      // debug
      debug('transport%s deps: %s', flag ? ' ' + flag : '', colors.magenta(id));

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
      // parse map
      id = util.parseMap(id, options.map);

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
    }

    return id;
  }, options.js.flags));

  // cache file dependencies
  vinyl.package = util.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * transport css dependencies.
 * @param vinyl
 * @param options
 * @returns {Array}
 */
function transportCssDeps(vinyl, options) {
  var deps = [];
  var include = [];
  var pkg = vinyl.package || {};
  var onpath = options.css.onpath;
  var prefix = options.css.prefix;

  // init css settings
  onpath = is.fn(onpath) ? function(path, property) {
    return options.css.onpath(path, property, vinyl.path, options.wwwroot);
  } : null;
  prefix = is.fn(prefix) ? prefix(vinyl.path, options.wwwroot) : prefix;

  // replace imports and collect dependencies
  vinyl.contents = new Buffer(css(vinyl.contents, function(id) {
    var path;

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);
    } else {
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

      // debug
      debug('transport deps: %s', colors.magenta(id));

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
      // parse map
      id = util.parseMap(id, options.map);

      // get absolute path
      path = util.resolve(path, vinyl, options.wwwroot);

      // cache dependencie id
      deps.push(id);
      // cache dependencie absolute path
      include.push({
        id: id,
        path: path
      });
    }

    // delete all import
    return false;
  }, { prefix: prefix, onpath: onpath }));

  // Cache file dependencies
  vinyl.package = util.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * exports module
 */
exports.initOptions = initOptions;
exports.transportId = transportId;
exports.transportDeps = transportDeps;
exports.transportCssDeps = transportCssDeps;
