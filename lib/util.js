/*!
 * util
 * Version: 0.0.1
 * Date: 2017/07/11
 * https://github.com/nuintun/gulp-cmd
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-cmd/blob/master/LICENSE
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

/**
 * rename
 *
 * @param {String} path
 * @param {Function} transform
 * @returns {String}
 */
function rename(path, transform) {
  return gutil.rename(path, transform, debug);
}

/**
 * transport
 *
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @param {Function} done
 * @returns {void}
 */
function transport(vinyl, options, done) {
  return gutil.transport(vinyl, options, done, cache, debug);
}

/**
 * resolve a id from file or wwwroot path
 *
 * @param {String} id
 * @param {Vinyl} vinyl
 * @param {String} wwwroot
 * @param {String} base
 * @param {Boolean} css
 * @returns {String}
 */
function resolve(id, vinyl, wwwroot, base, css) {
  var path;

  // resolve
  if (gutil.isAbsolute(id)) {
    path = join(wwwroot, id);
  } else if (css || gutil.isRelative(id)) {
    path = join(dirname(vinyl.path), id);

    // out of base, use wwwroot
    if (gutil.isOutBound(path, wwwroot)) {
      gutil.throwError('file: %s is out of bound of wwwroot: %s.', gutil.normalize(path), gutil.normalize(wwwroot));
    }
  } else {
    path = join(base, id);
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

  process.stdout.write(gutil.colors.reset.cyan.bold('  gulp-cmd ') + message + '\n');
}

/**
 * get rename options
 *
 * @param {Function|Object} transform
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
 * init ignore
 *
 * @param {Object} options
 * @return {Object}
 */
function initIgnore(options) {
  var ignore = {};

  // only run in all and relative mode
  if (options.include === 'self') return ignore;

  // format ignore
  Array.isArray(options.ignore) && options.ignore.forEach(function(id) {
    // compute id
    id = computeId(id, options);

    // local id add ignore
    if (gutil.isLocal(id)) {
      var path;

      if (gutil.isAbsolute(id)) {
        path = join(options.wwwroot, id);
      } else {
        path = join(options.base, id);
      }

      ignore[addExt(path)] = true;
    }
  });

  return ignore;
}

/**
 * init options
 *
 * @param {Object} options
 * @returns {Object}
 */
function initOptions(options) {
  // mix
  options = gutil.extend(true, {
    css: {}, // { prefix: null, onpath: null }
    map: [], // the map
    vars: {}, // the vars
    paths: {}, // the paths
    alias: {}, // the alias
    cache: true, // use memory file cahe
    ignore: [], // omit the given dependencies when include
    wwwroot: '', // web root
    base: '', // base dir
    rename: null, // { debug: boolean, min: boolean }
    plugins: null, // file trnasport plugins
    include: 'relative', // include model: self, relative, all
  }, options);

  // wwwroot must be string
  if (!gutil.isString(options.wwwroot)) {
    gutil.throwError('options.wwwroot\'s value should be string.');
  }

  // base must be string
  if (!gutil.isString(options.base)) {
    gutil.throwError('options.base\'s value should be string.');
  }

  // init wwwroot dir
  options.wwwroot = join(gutil.cwd, options.wwwroot);
  // init base dir
  options.base = join(options.wwwroot, options.base);

  // base out of bound of wwwroot
  if (gutil.isOutBound(options.base, options.wwwroot)) {
    gutil.throwError('options.base is out bound of options.wwwroot.');
  }

  // init css settings
  options.css = options.css || {};
  // init rename
  options.rename = initRenameOptions(options.rename);
  // init plugins
  options.plugins = gutil.plugins(options.plugins, require('./plugins/index'));
  // init js settings
  options.js = options.js || {};

  // init js flags
  if (!options.js.hasOwnProperty('flags')) {
    options.js.flags = ['async'];
  }

  // init ignore
  options.ignore = initIgnore(options);

  return options;
}

/**
 * transport vinyl id
 *
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {String}
 */
function transportId(vinyl, options) {
  // parse module id
  var id = gutil.parseId(vinyl, options.wwwroot, options.base);

  // rename id
  id = addExt(id);
  id = rename(id, options.rename);

  // rewrite vinyl path
  if (gutil.isAbsolute(id)) {
    vinyl.path = path.resolve(options.wwwroot, id);
  } else {
    vinyl.path = path.resolve(options.base, id);
  }

  // hide extname
  id = hideExt(id);
  // normalize
  id = gutil.normalize(id);

  // debug
  debug('module id: %p', id);

  // parse map
  id = gutil.parseMap(id, options.map, vinyl.path, options.wwwroot);
  // normalize id
  id = gutil.normalize(id);

  // set vinyl package info
  vinyl.package = { id: id };

  return id;
}

/**
 * transport cmd dependencies.
 *
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
function transportDeps(vinyl, options) {
  var deps = [];
  var include = [];
  var pkg = vinyl.package || {};

  // replace require and collect dependencies
  vinyl.contents = new Buffer(cmd(vinyl.contents.toString(), function(id, flag) {
    if (gutil.isLocal(id)) {
      // normalize id
      id = gutil.normalize(id);
      // compute id
      id = computeId(id, options);

      if (gutil.isLocal(id)) {
        // if end with /, find index file
        if (id.substring(id.length - 1) === '/') {
          id += 'index';
        }

        // debug
        debug('module%s deps: %p', flag ? ' ' + flag : '', id);

        // add extname
        id = addExt(id);

        var path;

        // dependencie real path
        if (flag === null) {
          path = resolve(id, vinyl, options.wwwroot, options.base);
        }

        // rename id
        id = rename(id, options.rename);
        // hide extname
        id = hideExt(id);
        // normalize id
        id = gutil.normalize(id);

        // cache dependencie id
        deps.push(id);
        // cache dependencie id and path
        if (flag === null) {
          // cache dependencie absolute path
          include.push({
            id: id,
            path: path
          });
        }

        // parse map
        id = gutil.parseMap(id, options.map, vinyl.path, options.wwwroot);
        // normalize id
        id = gutil.normalize(id);
      } else {
        // debug
        debug('module remote%s deps: %p', flag ? ' ' + flag : '', id);
        // cache dependencie id
        deps.push(id);
      }
    } else {
      // debug
      debug('module remote%s deps: %p', flag ? ' ' + flag : '', id);
      // cache dependencie id
      deps.push(id);
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
 * @param {Vinyl} vinyl
 * @param {Object} options
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
    return options.css.onpath(path, vinyl.path, options.wwwroot, property);
  } : null;
  prefix = gutil.isFunction(prefix) ? prefix(vinyl.path, options.wwwroot) : prefix;

  // replace imports and collect dependencies
  vinyl.contents = new Buffer(css(vinyl.contents, function(id) {
    if (gutil.isLocal(id)) {
      // normalize id
      id = gutil.normalize(id);

      // css import parsing rules using html
      if (!gutil.isRelative(id)
        && !gutil.isAbsolute(id)) {
        id = './' + id;
      }

      // if end with /, find index file
      if (id.substring(id.length - 1) === '/') {
        id += 'index.css';
      }

      // debug
      debug('module deps: %p', id);

      var path;

      // add extname
      id = addExt(id);
      // dependencie real path
      path = resolve(id, vinyl, options.wwwroot, options.base, true);
      // rename id
      id = rename(id, options.rename);
      // hide extname
      id = hideExt(id);
      // normalize id
      id = gutil.normalize(id);

      // cache dependencie id
      deps.push(id);
      // cache dependencie absolute path
      include.push({
        id: id,
        path: path
      });

      // parse map
      id = gutil.parseMap(id, options.map, vinyl.path, options.wwwroot);
      // normalize id
      id = gutil.normalize(id);
    } else {
      // debug
      debug('module remote deps: %p', id);
      // cache dependencie id
      deps.push(id);
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
 * simple template
 *
 * @param {String} format
 * @param {Object} data
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
 * @param {String} id
 * @param {Object} alias
 * @returns {String}
 */
function parseAlias(id, alias) {
  alias = alias || {};

  return alias && gutil.isString(alias[id]) ? alias[id] : id;
}

/**
 * parse paths
 *
 * @param {String} id
 * @param {Object} paths
 * @returns {String}
 */
function parsePaths(id, paths) {
  var match;

  paths = paths || {};

  if (paths
    && (match = id.match(/^([^/:]+)(\/.+)$/))
    && gutil.isString(paths[match[1]])) {
    id = paths[match[1]] + match[2];
  }

  return id;
}

/**
 * parse vars
 *
 * @param {String} id
 * @param {Object} vars
 * @returns {String}
 */
function parseVars(id, vars) {
  vars = vars || {};

  if (vars && id.indexOf('{') !== -1) {
    id = id.replace(/{([^{]+)}/g, function(match, key) {
      return gutil.isString(vars[key]) ? vars[key] : match;
    });
  }

  return id;
}

/**
 * compute module id
 *
 * @param {String} id
 * @param {Object} options
 * @return {String}
 */
function computeId(id, options) {
  var alias = options.alias;
  var paths = options.paths;
  var vars = options.vars;

  // parse id form alias, paths, vars
  id = parseAlias(id, alias);
  id = parsePaths(id, paths);
  id = parseAlias(id, alias);
  id = parseVars(id, vars);
  id = parseAlias(id, alias);

  return id;
}

/**
 * add .js if not exists
 *
 * @param {String} path
 * @returns {String}
 */
function addExt(path) {
  return /\.js$/i.test(path) ? path : (path + '.js');
}

/**
 * hide .js if exists
 *
 * @param {String} path
 * @param {Boolean} force
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
 * @param {String} id
 * @param {Array} deps
 * @param {String} code
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

// exports
module.exports = {
  debug: debug,
  cache: cache,
  rename: rename,
  transport: transport,
  resolve: resolve,
  print: print,
  initIgnore: initIgnore,
  initOptions: initOptions,
  transportId: transportId,
  transportDeps: transportDeps,
  transportCssDeps: transportCssDeps,
  parseAlias: parseAlias,
  addExt: addExt,
  hideExt: hideExt,
  wrapModule: wrapModule
};
