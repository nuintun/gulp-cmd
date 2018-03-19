/**
 * @module utils
 * @license MIT
 * @version 2017/11/13
 */

import fs from 'fs';
import gutil from '@nuintun/gulp-util';
import { resolve as pResolve, join, dirname } from 'path';

// Debug
export const debug = gutil.debug('gulp-cmd');

/**
 * @function resolve
 * @description Resolve a request path
 * @param {string} request
 * @param {string} referer
 * @param {Object} options
 * @returns {string}
 */
export function resolve(request, referer, options) {
  let path;

  // Resolve
  if (gutil.isAbsolute(request)) {
    path = join(options.root, request);
  } else if (gutil.isRelative(request)) {
    path = join(dirname(referer), request);

    // Out of bounds of root
    if (gutil.isOutBounds(path, options.root)) {
      throw new RangeError(`File ${gutil.normalize(path)} is out of bounds of root.`);
    }
  } else {
    const base = options.base || dirname(referer);

    // Use base or referer dirname
    path = join(base, request);
  }

  return path;
}

/**
 * @function parseAlias
 * @param {string} id
 * @param {Object} alias
 * @returns {string}
 */
export function parseAlias(id, alias) {
  return alias && gutil.isString(alias[id]) ? alias[id] : id;
}

/**
 * @function addExt
 * @description Add .js if not exists
 * @param {string} path
 * @returns {string}
 */
export function addExt(path) {
  return `${path}.js`;
}

/**
 * @function hideExt
 * @description Hide .js if exists
 * @param {string} path
 * @returns {string}
 */
export function hideExt(path) {
  return path.replace(/\.js$/i, '');
}

/**
 * @function initIgnore
 * @param {Object} options
 * @return {Object}
 */
export function initIgnore(options) {
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
        ignore.add(addExt(join(isAbsolute(id) ? root : base, id)));
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
export function initOptions(options) {
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
  gutil.readonly(options, 'root', pResolve(options.root));

  // Init base dir
  gutil.readonly(options, 'base', join(options.root, options.base));

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
 * @param {Array} deps
 * @param {string} code
 * @param {boolean} strict
 * @param {number} indent
 * @returns {string}
 */
export function wrapModule(id, deps, code, strict, indent) {
  // Debug
  debug('compile module %p', id);

  if (Buffer.isBuffer(code)) code = code.toString();

  id = JSON.stringify(id);
  deps = JSON.stringify(deps, null, indent);

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

  return header + code + footer;
}

// Promisify stat and readFile
const readStat = gutil.promisify(fs.stat);
const readFile = gutil.promisify(fs.readFile);

/**
 * @function loadModule
 * @param {string} path
 * @param {Object} options
 */
export async function loadModule(path, options) {
  let contents;

  try {
    contents = await readFile(path);
  } catch (error) {
    path = addExt(path);
  }

  contents = await readFile(path);

  const stat = await readStat(path);

  return new gutil.VinylFile({
    path,
    stat,
    contents,
    base: options.base
  });
}
