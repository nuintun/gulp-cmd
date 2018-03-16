/**
 * @module @nuintun/gulp-cmd
 * @author nuintun
 * @license MIT
 * @version 0.1.0
 * @description A gulp plugin for cmd transport and concat
 * @see https://nuintun.github.io/gulp-cmd
 */

'use strict';

const cmdDeps = require('cmd-deps');
const gutil = require('@nuintun/gulp-util');
const path = require('path');
const Bundler = require('@nuintun/bundler');
const through = require('@nuintun/through');

/**
 * @module utils
 * @license MIT
 * @version 2017/11/13
 */

// Cache
const cache = new gutil.Cache();

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

  // Debug
  debug('Resolved path %C', path$$1);

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

const DEFAULT_MODULE_EXT_RE = /\.js$/i;

/**
 * @function addExt
 * @description Add .js if not exists
 * @param {string} path
 * @returns {string}
 */
function addExt(path$$1) {
  return DEFAULT_MODULE_EXT_RE.test(path$$1) ? path$$1 : path$$1 + '.js';
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
      cache: true, // Use files cache
      strict: true, // Use strict mode
      combine: false, // Combine all modules
      ignore: [], // Ignore module lists when combine is true
      css: { onpath: null, loader: 'css-loader' }, // CSS parser option { onpath: null, loader: null }
      js: { require: 'require', flags: ['async'] } // JavaScript parser option { flags: ['async'] }
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

  return options;
}

/**
 * @module bundler
 * @license MIT
 * @version 2018/03/16
 */
// import cssDeps from '@nuintun/css-deps';

/**
 * @function bundler
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl}
 */
async function bundler(vinyl, options) {
  const bundler = await new Bundler({
    input: vinyl.path,
    resolve: (request, referer) => {
      const root = options.root;
      const base = options.base;
      const css = /\.css$/i.test(referer);

      return resolve(request, referer, css ? { root } : { root, base });
    },
    parse: path$$1 => {
      if (vinyl.path === path$$1) {
        const parsed = cmdDeps(vinyl.contents, id => parseAlias(id, options.alias), {
          flags: options.js.flags,
          word: options.js.require,
          allowReturnOutsideFunction: true
        });

        const contents = (vinyl.contents = gutil.buffer(parsed.code));
        const dependencies = parsed.dependencies.reduce((dependencies, dependency) => {
          if (dependency.flag === null) {
            dependencies.push(dependency.path);
          }

          return dependencies;
        }, []);

        return { dependencies, contents };
      } else {
        gutil.logger(path$$1);
      }
    }
  });

  return vinyl;
}

/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

function main(options) {
  options = initOptions(options);

  return through(async function(vinyl, encoding, next) {
    vinyl = gutil.vinyl(vinyl);
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
  });
}

module.exports = main;
