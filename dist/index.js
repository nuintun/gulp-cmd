/**
 * @module @nuintun/gulp-cmd
 * @author nuintun
 * @license MIT
 * @version 0.1.0
 * @description A gulp plugin for cmd transport and concat
 * @see https://nuintun.github.io/gulp-cmd
 */

'use strict';

const fs = require('fs');
const gutil = require('@nuintun/gulp-util');
const path = require('path');
const jsDeps = require('cmd-deps');
const Bundler = require('@nuintun/bundler');
const through = require('@nuintun/through');

/**
 * @module utils
 * @license MIT
 * @version 2017/11/13
 */

// Debug
const debug = gutil.debug('gulp-cmd');

/**
 * @function resolve
 * @description Resolve a request path
 * @param {string} request
 * @param {string} referer
 * @param {Object} options
 * @returns {string}
 */
function resolve(request, referer, options) {
  let path$$1;

  // Resolve
  if (gutil.isAbsolute(request)) {
    path$$1 = path.join(options.root, request);
  } else if (gutil.isRelative(request)) {
    path$$1 = path.join(path.dirname(referer), request);

    // Out of bounds of root
    if (gutil.isOutBounds(path$$1, options.root)) {
      throw new RangeError(`File ${gutil.normalize(path$$1)} is out of bounds of root.`);
    }
  } else {
    const base = options.base || path.dirname(referer);

    // Use base or referer dirname
    path$$1 = path.join(base, request);
  }

  return path$$1;
}

/**
 * @function parseAlias
 * @param {string} id
 * @param {Object} alias
 * @returns {string}
 */
function parseAlias(id, alias) {
  return alias && gutil.isString(alias[id]) ? alias[id] : id;
}

/**
 * @function addExt
 * @description Add .js if not exists
 * @param {string} path
 * @returns {string}
 */
function addExt(path$$1) {
  return `${path$$1}.js`;
}

/**
 * @function initIgnore
 * @param {Object} options
 * @return {Object}
 */
function initIgnore(options) {
  const ignore = new Set();

  // Format ignore
  if (Array.isArray(options.ignore)) {
    const root = options.root;
    const base = options.base;
    const alias = options.alias;
    const isAbsolute = gutil.isAbsolute;

    options.ignore.forEach(id => {
      // Compute id
      id = parseAlias(id, alias);

      // Local id add ignore
      if (gutil.isLocal(id)) {
        ignore.add(addExt(path.join(isAbsolute(id) ? root : base, id)));
      }
    });
  }

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
      root: '', // Web root
      base: '', // Base dir
      alias: {}, // Alias
      map: [], // Module map
      plugins: [], // Plugins
      indent: 2, // Code indent
      strict: true, // Use strict mode
      combine: false, // Combine all modules
      ignore: [], // Ignore module lists when combine is true
      js: { flags: ['async'] }, // JavaScript parser option { flags: ['async'] }
      css: { onpath: null, loader: 'css-loader' } // CSS parser option { onpath: null, loader: null }
    },
    options
  );

  // Option root must be string
  if (!gutil.isString(options.root)) {
    throw new TypeError(`The options.root's value must be a string.`);
  }

  // Option base must be string
  if (!gutil.isString(options.base)) {
    throw new TypeError(`The options.base's value must be a string.`);
  }

  // Init root dir
  gutil.readonly(options, 'root', path.resolve(options.root));

  // Init base dir
  gutil.readonly(options, 'base', path.join(options.root, options.base));

  // The base out of bounds of root
  if (gutil.isOutBounds(options.base, options.root)) {
    throw new TypeError('The options.base is out bounds of options.root.');
  }

  // Init plugins
  gutil.readonly(options, 'plugins', Array.isArray(options.plugins) ? options.plugins : []);

  // Init js settings
  options.js = options.js || { require: 'require', flags: ['async'] };

  // Init js require
  if (!options.js.require) {
    options.js.require = 'require';
  }

  // Init js flags
  if (!Array.isArray(options.js.flags)) {
    options.js.flags = ['async'];
  }

  // Init css settings
  options.css = options.css || { onpath: null, loader: 'css-loader' };

  // Init css loader
  if (!options.css.loader || !gutil.isString(options.css.loader)) {
    throw new TypeError('The options.css.loader must be a nonempty string.');
  }

  // Init ignore
  options.ignore = initIgnore(options);

  // Init indent
  options.indent = Math.min(10, Math.max(0, options.indent >> 0));

  // Init cache
  gutil.readonly(options, 'cache', new Map());

  return options;
}

const LINEFEED_RE = /[\r\n]+/g;

/**
 * @function wrapModule
 * @param {string} id
 * @param {Array|Set} deps
 * @param {string} code
 * @param {boolean} strict
 * @param {number} indent
 * @returns {string}
 */
function wrapModule(id, deps, code, options) {
  const strict = options.strict;
  const indent = options.indent;

  if (Buffer.isBuffer(code)) code = code.toString();

  id = JSON.stringify(id);
  deps = JSON.stringify(Array.from(deps), null, indent);

  if (strict !== false) {
    code = `'use strict';\n\n${code}`;
  }

  if (indent > 0) {
    const pad = new Array(indent + 1).join(' ');

    code = pad + code.replace(LINEFEED_RE, `$&${pad}`);
  }

  // Header and footer template string
  const header = `define(${id}, ${deps}, function(require, exports, module){\n`;
  const footer = '\n});\n';

  return gutil.buffer(header + code + footer);
}

// Promisify stat and readFile
const fsReadStat = gutil.promisify(fs.stat);
const fsReadFile = gutil.promisify(fs.readFile);

/**
 * @function fsSafeAccess
 * @param {string} path
 * @param {Number} mode
 */
function fsSafeAccess(path$$1, mode = fs.constants.R_OK) {
  try {
    fs.accessSync(path$$1, mode);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * @function loadModule
 * @param {string} path
 * @param {Object} options
 */
async function loadModule(path$$1, options) {
  // Read module
  const stat = await fsReadStat(path$$1);
  const contents = await fsReadFile(path$$1);

  // Return a vinyl file
  return new gutil.VinylFile({
    path: path$$1,
    stat,
    contents,
    base: options.base
  });
}

/**
 * @function isCSSFile
 * @param {string} path
 */
function isCSSFile(path$$1) {
  return /\.css$/i.test(path$$1);
}

/**
 * @module js
 * @license MIT
 * @version 2018/03/19
 */

/**
 * @function resolveModuleId
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {string}
 */
function resolveModuleId(vinyl, options) {
  const root = options.root;
  const base = options.base;
  let id = gutil.moduleId(vinyl, root, base);

  // Parse map
  id = gutil.parseMap(id, vinyl.path, options.map);
  id = gutil.normalize(id);

  // Add ext
  if (isCSSFile(id)) {
    id = addExt(id);
  }

  return id;
}

/**
 * @function jsPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 */
function jsPackager(vinyl, options) {
  const deps = new Set();
  const referer = vinyl.path;
  const root = options.root;
  const base = options.base;
  const dependencies = new Set();

  // Parse module
  const meta = jsDeps(
    vinyl.contents,
    (dependency, flag) => {
      dependency = parseAlias(dependency, options.alias);
      dependency = gutil.normalize(dependency);

      // Only collect local bependency
      if (gutil.isLocal(dependency)) {
        // If path end with /, use index.js
        if (dependency.endsWith('/')) dependency += 'index.js';

        // Resolve dependency
        let resolved = resolve(dependency, referer, { root, base });

        // Only collect require no flag
        if (flag === null) {
          // Add extname
          if (!path.extname(resolved)) {
            resolved = addExt(resolved);
          }

          // Module can read
          if (fsSafeAccess(resolved)) {
            dependencies.add(resolved);
          } else {
            // Module can't read, add ext .js test again
            resolved = addExt(resolved);

            // Module can read
            if (fsSafeAccess(resolved)) {
              dependencies.add(resolved);
            } else {
              // Relative referer from cwd
              const rpath = JSON.stringify(gutil.path2cwd(referer));

              // Output warn message
              gutil.logger.warn(
                gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.\x07`)
              );
            }
          }
        }

        // Parse map
        dependency = gutil.parseMap(dependency, resolved, options.map);
        dependency = gutil.normalize(dependency);

        // The seajs has hacked css before 3.0.0
        // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
        // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
        if (isCSSFile(dependency)) {
          dependency = addExt(dependency);
        }

        // Add dependency
        deps.add(dependency);
      }

      // Return dependency
      return dependency;
    },
    {
      flags: options.js.flags,
      allowReturnOutsideFunction: true
    }
  );

  // Resolve module id
  const id = resolveModuleId(vinyl, options);
  // Get contents
  const contents = wrapModule(id, deps, meta.code, options);
  // Rewrite path
  const path$$1 = !/\.js/i.test(referer) ? addExt(referer) : referer;

  return { path: path$$1, dependencies, contents };
}

/**
 * @module index
 * @license MIT
 * @version 2018/03/19
 */

/**
 * @module bundler
 * @license MIT
 * @version 2018/03/16
 */

function parse(vinyl, options) {
  const meta = jsPackager(vinyl, options);
  const contents = meta.contents;
  const dependencies = meta.dependencies;

  // Rewrite path
  vinyl.path = meta.path;

  return { dependencies, contents };
}

/**
 * @function combine
 * @param {Set} bundles
 * @returns {Buffer}
 */
function combine(bundles) {
  const files = [];

  bundles.forEach(bundle => {
    files.push(bundle.contents);
  });

  return Buffer.concat(files);
}

/**
 * @function bundler
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl}
 */
async function bundler(vinyl, options) {
  const cache = options.cache;

  // Bundler
  const bundles = await new Bundler({
    input: vinyl.path,
    resolve: path$$1 => path$$1,
    parse: async path$$1 => {
      // Hit cache
      if (cache.has(path$$1)) {
        return cache.get(path$$1);
      }

      // Meta
      let meta;

      // Is entry file
      if (vinyl.path === path$$1) {
        meta = parse(vinyl, options);
      } else {
        meta = parse(await loadModule(path$$1, options), options);
      }

      // Set cache
      cache.set(path$$1, meta);

      // Return meta
      return meta;
    }
  });

  // Combine files
  vinyl.contents = combine(bundles);

  return vinyl;
}

/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

function main(options) {
  options = initOptions(options);

  return through(
    async function(vinyl, encoding, next) {
      vinyl = gutil.VinylFile.wrap(vinyl);
      vinyl.base = options.base;

      // Throw error if stream vinyl
      if (vinyl.isStream()) {
        return next(new TypeError('Streaming not supported.'));
      }

      // Return empty vinyl
      if (vinyl.isNull()) {
        return next(null, vinyl);
      }

      next(null, await bundler(vinyl, options));
    },
    next => {
      options.cache.clear();

      next();
    }
  );
}

module.exports = main;
