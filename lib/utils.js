/**
 * @module utils
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const path = require('path');
const util = require('util');
const cmd = require('cmd-deps');
const css = require('@nuintun/css-deps');
const gutil = require('@nuintun/gulp-util');

const join = path.join;
const dirname = path.dirname;
const basename = path.basename;
const relative = path.relative;
const cache = new gutil.Cache();
const debug = gutil.debug('gulp-cmd');

/**
 * @function rename
 * @param {string} path
 * @param {Function} transform
 * @returns {String}
 */
function rename(path, transform) {
  return gutil.rename(path, transform, debug);
}

/**
 * @function transport
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @param {Function} done
 */
function transport(vinyl, options, done) {
  return gutil.transport(vinyl, options, done, cache, debug);
}

/**
 * @function resolve
 * @description Resolve a id from file or wwwroot path
 * @param {String} id
 * @param {Vinyl} vinyl
 * @param {String} wwwroot
 * @param {String} base
 * @param {Boolean} css
 * @returns {String}
 */
function resolve(id, vinyl, wwwroot, base, css) {
  let path;

  // Resolve
  if (gutil.isAbsolute(id)) {
    path = join(wwwroot, id);
  } else if (css || gutil.isRelative(id)) {
    path = join(dirname(vinyl.path), id);

    // Out of base, use wwwroot
    if (gutil.isOutBound(path, wwwroot)) {
      gutil.throwError('file: %s is out of bound of wwwroot: %s.', gutil.normalize(path), gutil.normalize(wwwroot));
    }
  } else {
    path = join(base, id);
  }

  // Debug
  debug('resolve path: %r', path);

  return path;
}

/**
 * @function print
 */
function print() {
  const message = gutil.apply(util.format, null, gutil.slice.call(arguments));

  process.stdout.write(gutil.chalk.reset.cyan.bold('  gulp-cmd ') + message + '\n');
}

/**
 * @function initRenameOptions
 * @description Get rename options
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
 * @function initIgnore
 * @param {Object} options
 * @return {Object}
 */
function initIgnore(options) {
  const ignore = {};

  // Only run in all and relative mode
  if (options.include === 'self') return ignore;

  // Format ignore
  Array.isArray(options.ignore) &&
    options.ignore.forEach(id => {
      // Compute id
      id = computeId(id, options);

      // Local id add ignore
      if (gutil.isLocal(id)) {
        let path;

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
 * @function initOptions
 * @param {Object} options
 * @returns {Object}
 */
function initOptions(options) {
  // Mix options
  options = gutil.extend(
    true,
    {
      css: {}, // CSS parser option { prefix: null, onpath: null }
      map: [], // The map
      vars: {}, // The vars
      paths: {}, // The paths
      alias: {}, // The alias
      indent: 2, // The code indent
      strict: true, // Use strict mode
      cache: true, // Use memory file cahe
      ignore: [], // Omit the given dependencies when include
      wwwroot: '', // Web root
      base: '', // Base dir
      rename: null, // Rename option { debug: boolean, min: boolean }
      plugins: null, // File trnasport plugins
      include: 'relative' // Include model: self, relative, all
    },
    options
  );

  // Option wwwroot must be string
  if (!gutil.isString(options.wwwroot)) {
    gutil.throwError("options.wwwroot's value should be string.");
  }

  // Option base must be string
  if (!gutil.isString(options.base)) {
    gutil.throwError("options.base's value should be string.");
  }

  // Init wwwroot dir
  options.wwwroot = join(gutil.cwd, options.wwwroot);
  // Init base dir
  options.base = join(options.wwwroot, options.base);

  // The base out of bound of wwwroot
  if (gutil.isOutBound(options.base, options.wwwroot)) {
    gutil.throwError('options.base is out bound of options.wwwroot.');
  }

  // Init css settings
  options.css = options.css || {};
  // Init rename
  options.rename = initRenameOptions(options.rename);
  // Init plugins
  options.plugins = gutil.plugins(options.plugins, require('./plugins/index'));
  // Init js settings
  options.js = options.js || {};

  // Init js flags
  if (!options.js.hasOwnProperty('flags')) {
    options.js.flags = ['async'];
  }

  // Init ignore
  options.ignore = initIgnore(options);

  // Init indent
  options.indent = Math.min(10, Math.max(0, options.indent >> 0));

  return options;
}

/**
 * @function transportId
 * @description Transport vinyl id
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {string}
 */
function transportId(vinyl, options) {
  // Parse module id
  let id = gutil.parseId(vinyl, options.wwwroot, options.base);

  // Rename id
  id = addExt(id);
  id = rename(id, options.rename);

  // Rewrite vinyl path
  if (gutil.isAbsolute(id)) {
    vinyl.path = path.resolve(options.wwwroot, id);
  } else {
    vinyl.path = path.resolve(options.base, id);
  }

  // Hide extname
  id = hideExt(id);
  // Normalize
  id = gutil.normalize(id);

  // Debug
  debug('module id: %p', id);

  // Parse map
  id = gutil.parseMap(id, options.map, vinyl.path, options.wwwroot);
  // Normalize id
  id = gutil.normalize(id);

  // Set vinyl package info
  vinyl.package = { id: id };

  return id;
}

/**
 * @function transportDeps
 * @description Transport cmd dependencies.
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
function transportDeps(vinyl, options) {
  const deps = [];
  const include = [];
  const pkg = vinyl.package || {};

  // Replace require and collect dependencies
  vinyl.contents = new Buffer(
    cmd(
      vinyl.contents.toString(),
      (id, flag) => {
        if (gutil.isLocal(id)) {
          const src = id;

          // Normalize id
          id = gutil.normalize(id);
          // Compute id
          id = computeId(id, options);

          if (gutil.isLocal(id)) {
            // If end with /, find index file
            if (id.substring(id.length - 1) === '/') {
              id += 'index';
            }

            // Debug
            debug('module%s deps: %p', flag ? ' ' + flag : '', id);

            // Add extname
            id = addExt(id);

            // Sync module
            if (flag === null) {
              // Cache need include module
              include.push({
                id: src,
                path: resolve(id, vinyl, options.wwwroot, options.base)
              });
            }

            // Rename id
            id = rename(id, options.rename);
            // Hide extname
            id = hideExt(id);
            // Normalize id
            id = gutil.normalize(id);
            // Parse map
            id = gutil.parseMap(id, options.map, vinyl.path, options.wwwroot);
            // Normalize id
            id = gutil.normalize(id);
          } else {
            // Debug
            debug('module remote%s deps: %p', flag ? ' ' + flag : '', src);
          }
        } else {
          // Debug
          debug('module remote%s deps: %p', flag ? ' ' + flag : '', id);
        }

        // Cache dependencie id
        deps.push(id);

        return id;
      },
      options.js.flags
    )
  );

  // Cache file dependencies
  vinyl.package = gutil.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * @function transportCssDeps
 * @description Transport css dependencies.
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Array}
 */
function transportCssDeps(vinyl, options) {
  const deps = [];
  const include = [];
  const pkg = vinyl.package || {};
  let onpath = options.css.onpath;
  let prefix = options.css.prefix;

  // Init css settings
  onpath = gutil.isFunction(onpath)
    ? (path, property) => {
        return options.css.onpath(path, vinyl.path, options.wwwroot, property);
      }
    : null;
  prefix = gutil.isFunction(prefix) ? prefix(vinyl.path, options.wwwroot) : prefix;

  // Replace imports and collect dependencies
  vinyl.contents = new Buffer(
    css(
      vinyl.contents,
      id => {
        if (gutil.isLocal(id)) {
          // Normalize id
          id = gutil.normalize(id);

          // CSS import parsing rules using html
          if (!gutil.isRelative(id) && !gutil.isAbsolute(id)) {
            id = './' + id;
          }

          // If end with /, find index file
          if (id.substring(id.length - 1) === '/') {
            id += 'index.css';
          }

          // Debug
          debug('module deps: %p', id);

          let path;

          // Add extname
          id = addExt(id);
          // Dependencie real path
          path = resolve(id, vinyl, options.wwwroot, options.base, true);
          // Rename id
          id = rename(id, options.rename);
          // Hide extname
          id = hideExt(id);
          // Normalize id
          id = gutil.normalize(id);

          // Cache dependencie id
          deps.push(id);
          // Cache dependencie absolute path
          include.push({
            id: id,
            path: path
          });

          // Parse map
          id = gutil.parseMap(id, options.map, vinyl.path, options.wwwroot);
          // Normalize id
          id = gutil.normalize(id);
        } else {
          // Debug
          debug('module remote deps: %p', id);
          // Cache dependencie id
          deps.push(id);
        }

        // Delete all import
        return false;
      },
      { prefix: prefix, onpath: onpath }
    )
  );

  // Cache file dependencies
  vinyl.package = gutil.extend(pkg, {
    include: include,
    dependencies: deps
  });

  return deps;
}

/**
 * @function parseAlias
 * @param {string} id
 * @param {Object} alias
 * @returns {string}
 */
function parseAlias(id, alias) {
  alias = alias || {};

  return alias && gutil.isString(alias[id]) ? alias[id] : id;
}

/**
 * @function parsePaths
 * @param {string} id
 * @param {Object} paths
 * @returns {string}
 */
function parsePaths(id, paths) {
  let match;

  paths = paths || {};

  if (paths && (match = id.match(/^([^/:]+)(\/.+)$/)) && gutil.isString(paths[match[1]])) {
    id = paths[match[1]] + match[2];
  }

  return id;
}

/**
 * @function parseVars
 * @param {string} id
 * @param {Object} vars
 * @returns {string}
 */
function parseVars(id, vars) {
  vars = vars || {};

  if (vars && id.indexOf('{') !== -1) {
    id = id.replace(/{([^{]+)}/g, (match, key) => {
      return gutil.isString(vars[key]) ? vars[key] : match;
    });
  }

  return id;
}

/**
 * @function computeId
 * @description Compute module id
 * @param {string} id
 * @param {Object} options
 * @return {string}
 */
function computeId(id, options) {
  const alias = options.alias;
  const paths = options.paths;
  const vars = options.vars;

  // Parse id form alias, paths, vars
  id = parseAlias(id, alias);
  id = parsePaths(id, paths);
  id = parseAlias(id, alias);
  id = parseVars(id, vars);
  id = parseAlias(id, alias);

  return id;
}

/**
 * @function addExt
 * @description Add .js if not exists
 * @param {string} path
 * @returns {string}
 */
function addExt(path) {
  return /\.js$/i.test(path) ? path : path + '.js';
}

/**
 * @function hideExt
 * @description Hide .js if exists
 * @param {string} path
 * @param {Boolean} force
 * @returns {string}
 */
function hideExt(path, force) {
  // The seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (!force && /\.css\.js$/i.test(path)) return path;

  return path.replace(/\.js$/i, '');
}

/**
 * @function wrapModule
 * @param {string} id
 * @param {Array} deps
 * @param {string} code
 * @param {boolean} strict
 * @param {number} indent
 * @returns {string}
 */
function wrapModule(id, deps, code, strict, indent) {
  // Debug
  debug('compile module: %p', id);

  if (Buffer.isBuffer(code)) code = code.toString();

  id = JSON.stringify(id);
  deps = JSON.stringify(deps, null, indent);

  if (strict !== false) {
    code = `'use strict';\n\n${code}`;
  }

  if (indent > 0) {
    const pad = new Array(indent + 1).join(' ');

    code = pad + code.replace(/[\r\n]+/g, `$&${pad}`);
  }

  // Header and footer template string
  const header = `define(${id}, ${deps}, function(require, exports, module){\n`;
  const footer = '\n});\n';

  return header + code + footer;
}

// Exports
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
