/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var path = require('path');
var util = require('util');
var cmd = require('cmd-deps');
var css = require('@nuintun/css-deps');
var gutil = require('@nuintun/gulp-util');

var join = path.join;
var dirname = path.dirname;
var basename = path.basename;
var relative = path.relative;
var cache = new gutil.Cache();
var debug = gutil.debug('gulp-cmd');

// regexp
var OUTBOUNDRE = /(?:^[\\\/]?)\.\.(?:[\\\/]|$)/;
var SPLITRE = /\/((?:\d+\.){2}\d+)(?:\/|$)/;
var PATHSRE = /^([^/:]+)(\/.+)$/;
var VARSRE = /{([^{]+)}/g;

/**
 * rename
 *
 * @param {any} path
 * @param {any} transform
 * @returns {String}
 */
function rename(path, transform) {
  return gutil.rename(path, transform, debug);
}

/**
 * transport
 *
 * @param {any} vinyl
 * @param {any} options
 * @param {any} done
 * @returns {void}
 */
function transport(vinyl, options, done) {
  return gutil.transport(vinyl, options, done, cache, debug);
}

/**
 * resolve a `relative` path base on `base` path
 *
 * @param relative
 * @param vinyl
 * @param wwwroot
 * @param css
 * @returns {String}
 */
function resolve(relative, vinyl, wwwroot, css) {
  var base;
  var path;

  // resolve
  if (gutil.isAbsolute(relative)) {
    base = wwwroot;
    path = join(base, relative.substring(1));
  } else if (css || gutil.isRelative(relative)) {
    base = dirname(vinyl.path);
    path = join(base, relative);

    // out of base, use wwwroot
    if (gutil.isOutBound(path, wwwroot)) {
      gutil.throwError('file: %s is out of bound of wwwroot: %s.', gutil.normalize(path), gutil.normalize(wwwroot));
    }
  } else {
    base = join(vinyl.cwd, vinyl.base);
    path = join(base, relative);
  }

  // debug
  debug('resolve path: %r', path);

  return path;
}

/**
 * pring
 *
 * @returns {void}
 */
function print() {
  var message = gutil.apply(util.format, null, gutil.slice.call(arguments));

  write(gutil.colors.cyan.bold('  gulp-cmd ') + message + '\n');
}

/**
 * get rename options
 *
 * @param transform
 * @returns {Object}
 */
function initRenameOptions(transform) {
  if (gutil.isFunction(transform)) {
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
 *
 * @param options
 * @returns {Object}
 */
function initOptions(options) {
  // mix
  options = gutil.extend(true, {
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
    idleading: '{{name}}/{{version}}/{{filename}}' // the id prefix template
  }, options);

  // wwwroot must be string
  if (!gutil.isString(options.wwwroot)) {
    gutil.throwError('options.wwwroot\'s value should be string.');
  }

  // init wwwroot
  options.wwwroot = join(gutil.cwd, options.wwwroot);
  // init plugins
  options.plugins = gutil.plugins(options.plugins, require('./plugins/index'));
  // init css settings
  options.css = options.css || {};
  // init rename
  options.rename = initRenameOptions(options.rename);
  // init ignore
  options.ignore = Array.isArray(options.ignore) ? options.ignore : [];
  // init js settings
  options.js = options.js || {};
  // init js flags
  if (!options.js.hasOwnProperty('flags')) {
    options.js.flags = ['async'];
  }

  return options;
}

/**
 * resolve id leading
 *
 * @param idleading
 * @param path
 * @param pkg
 * @returns {String}
 */
function resolveIdleading(idleading, path, pkg) {
  return gutil.isFunction(idleading) ? idleading(path, pkg) : idleading;
}

/**
 * transport vinyl id
 *
 * @param vinyl
 * @param options
 * @returns {String}
 */
function transportId(vinyl, options) {
  var id;
  var pkg = parsePackage(vinyl, options.wwwroot);
  var idleading = resolveIdleading(options.idleading, vinyl.path, pkg);

  // get id
  id = template(idleading, pkg)
    .replace(/^\.\//, '')
    .replace(/^\/\//, '/');

  // normalize
  id = gutil.normalize(id);

  // rename id
  id = addExt(id);
  id = rename(id, options.rename);

  // rewrite vinyl path
  if (gutil.isAbsolute(id)) {
    vinyl.path = join(options.wwwroot, id);
  } else {
    vinyl.path = join(vinyl.cwd, vinyl.base, id);
  }

  // hide extname
  id = hideExt(id);
  // normalize
  id = gutil.normalize(id);

  // debug
  debug('module id: %p', id);

  // parse map
  id = parseMap(id, options.map);

  // set vinyl package info
  vinyl.package = gutil.extend(pkg, { id: id });

  return id;
}

/**
 * transport cmd dependencies.
 *
 * @param vinyl
 * @param options
 * @returns {Object}
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
    id = parseAlias(id, alias);
    id = parsePaths(id, paths);
    id = parseAlias(id, alias);
    id = parseVars(id, vars);
    id = parseAlias(id, alias);

    // id is not a local file
    if (!gutil.isLocal(id)) {
      // cache dependencie id
      deps.push(id);
    } else {
      var path;

      // normalize id
      id = gutil.normalize(id);

      // if end with /, find index file
      if (id.substring(id.length - 1) === '/') {
        id += 'index';
      }

      // debug
      debug('module%s deps: %p', flag ? ' ' + flag : '', id);

      // add extname
      id = addExt(id);

      // dependencie real path
      if (flag === null) {
        path = resolve(id, vinyl, options.wwwroot);
      }

      // rename id
      id = rename(id, options.rename);
      // hide extname
      id = hideExt(id);

      // normalize id
      id = gutil.normalize(id);
      // parse map
      id = parseMap(id, options.map);

      // cache dependencie id and path
      if (flag === null) {
        // cache dependencie id
        deps.push(id);

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
  vinyl.package = gutil.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * transport css dependencies.
 *
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
  onpath = gutil.isFunction(onpath) ? function(path, property) {
    return options.css.onpath(path, property, vinyl.path, options.wwwroot);
  } : null;
  prefix = gutil.isFunction(prefix) ? prefix(vinyl.path, options.wwwroot) : prefix;

  // replace imports and collect dependencies
  vinyl.contents = new Buffer(css(vinyl.contents, function(id) {
    var path;

    // id is not a local file
    if (!gutil.isLocal(id)) {
      // cache dependencie id
      deps.push(id);
    } else {
      // normalize id
      id = gutil.normalize(id);

      var isRelative = gutil.isRelative(id);
      var isAbsolute = gutil.isAbsolute(id);

      // css import parsing rules using html
      if (!isAbsolute && !isRelative) {
        id = './' + id;
      }

      // if end with /, find index file
      if (id.substring(id.length - 1) === '/') {
        id += 'index.css';
      }

      // debug
      debug('module deps: %p', id);

      // add extname
      id = addExt(id);
      // dependencie real path
      path = resolve(id, vinyl, options.wwwroot, true);

      // rename id
      id = rename(id, options.rename);
      // hide extname
      id = hideExt(id);

      // normalize id
      id = gutil.normalize(id);
      // parse map
      id = parseMap(id, options.map);

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
  vinyl.package = gutil.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * parse package form vinyl
 *
 * @param vinyl
 * @param wwwroot
 * @returns {Object}
 */
function parsePackage(vinyl, wwwroot) {
  var path = vinyl.relative;

  // vinyl not in base dir, user wwwroot
  if (OUTBOUNDRE.test(path)) {
    path = relative(wwwroot, vinyl.path);
    // vinyl not in wwwroot, throw error
    if (OUTBOUNDRE.test(path)) {
      throwError('file: %s is out of bound of wwwroot: %s.', normalize(vinyl.path), normalize(wwwroot));
    }

    // reset path
    path = join('/', path);
  }

  var dir = gutil.normalize(dirname(path));
  var filename = basename(path);
  var match = dir.split(SPLITRE);

  return {
    name: match[0] || '',
    version: match[1] || '',
    filename: match[2] ? match[2] + '/' + filename : filename
  }
}

/**
 * simple template
 *
 * @param format
 * @param data
 * @returns {String}
 * ```
 * var tpl = '{{name}}/{{version}}';
 * util.template(tpl, {name:'base', version: '1.0.0'});
 * ```
 */
function template(format, data) {
  if (!gutil.isString(format)) return '';

  return format.replace(/{{([a-z]*)}}/gi, function(all, match) {
    return data[match] || '';
  });
}

/**
 * parse alias
 *
 * @param id
 * @param alias
 * @returns {String}
 */
function parseAlias(id, alias) {
  alias = alias || {};

  return alias && gutil.isString(alias[id]) ? alias[id] : id;
}

/**
 * parse paths
 *
 * @param id
 * @param paths
 * @returns {String}
 */
function parsePaths(id, paths) {
  var match;

  paths = paths || {};

  if (paths && (match = id.match(PATHSRE)) && gutil.isString(paths[match[1]])) {
    id = paths[match[1]] + match[2];
  }

  return id;
}

/**
 * parse vars
 *
 * @param id
 * @param vars
 * @returns {String}
 */
function parseVars(id, vars) {
  vars = vars || {};

  if (vars && id.indexOf('{') !== -1) {
    id = id.replace(VARSRE, function(match, key) {
      return gutil.isString(vars[key]) ? vars[key] : match;
    });
  }

  return id;
}

/**
 * parse map
 *
 * @param id
 * @param map
 * @returns {String}
 */
function parseMap(id, map) {
  var ret = id;

  if (Array.isArray(map)) {
    for (var i = 0, len = map.length; i < len; i++) {
      var rule = map[i];

      // parse map
      if (gutil.isFunction(rule)) {
        ret = rule(id);
      } else if (Array.isArray(rule)) {
        ret = id.replace(rule[0], rule[1]);
      }

      // must be string
      if (!ret || !gutil.isString(ret)) {
        ret = id;
      }

      // only apply the first matched rule
      if (ret !== id) break;
    }
  }

  return ret;
}

/**
 * add .js if not exists
 *
 * @param path
 * @returns {String}
 */
function addExt(path) {
  return /\.js$/i.test(path) ? path : (path + '.js');
}

/**
 * hide .js if exists
 *
 * @param path
 * @param force
 * @returns {String}
 */
function hideExt(path, force) {
  // seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (!force && /\.css\.js$/i.test(path)) return path;

  return path.replace(/\.js$/i, '');
}

/**
 * wrap module
 *
 * @param id
 * @param deps
 * @param code
 * @returns {string}
 */
function wrapModule(id, deps, code) {
  // header and footer template string
  var header = 'define({{id}}, {{deps}}, function(require, exports, module){';
  var footer = '});\n';

  if (Buffer.isBuffer(code)) code = code.toString();

  // debug
  debug('compile module: %p', id);

  id = JSON.stringify(id);
  deps = JSON.stringify(deps);

  return template(header, { id: id, deps: deps })
    + '\n' + code + '\n' + footer;
}

/**
 * print message
 */
function print() {
  var slice = [].slice;
  var message = util.format
    .apply(null, slice.call(arguments));

  process.stdout.write(gutil.colors.cyan.bold('  gulp-cmd ') + message + '\n');
}

// exports
module.exports = {
  debug: debug,
  cache: cache,
  rename: rename,
  transport: transport,
  resolve: resolve,
  print: print,
  initOptions: initOptions,
  transportId: transportId,
  transportDeps: transportDeps,
  transportCssDeps: transportCssDeps,
  parsePackage: parsePackage,
  template: template,
  parseAlias: parseAlias,
  parsePaths: parsePaths,
  parseVars: parseVars,
  parseMap: parseMap,
  addExt: addExt,
  hideExt: hideExt,
  wrapModule: wrapModule
};
