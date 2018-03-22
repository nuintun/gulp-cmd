/**
 * @module utils
 * @license MIT
 * @version 2017/11/13
 */

import fs from 'fs';
import * as gutil from '@nuintun/gulp-util';
import { resolve as pResolve, join, dirname, relative } from 'path';

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
  return alias && gutil.typpy(alias[id], String) ? alias[id] : id;
}

/**
 * @function isJSFile
 * @param {string} path
 * @returns {boolean}
 */
export function isJSFile(path) {
  return /[^\\/]+\.js$/i.test(path);
}

/**
 * @function isCSSFile
 * @param {string} path
 * @returns {boolean}
 */
export function isCSSFile(path) {
  return /[^\\/]+\.css$/i.test(path);
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
  options = gutil.attrs(options, {
    root: {
      type: String,
      default: process.cwd()
    },
    base: {
      required: true,
      type: String,
      onRequired: 'Options.%s is required.',
      onTypeError: 'Options.%s must be a string.'
    },
    js: { type: Object, default: {} },
    css: { type: Object, default: {} },
    alias: { type: Object, default: {} },
    indent: { type: Number, default: 2 },
    ignore: { type: Array, default: [] },
    plugins: { type: Array, default: [] },
    strict: { type: Boolean, default: true },
    combine: { type: Boolean, default: true },
    map: { type: [null, Function], default: null },
    'js.flags': { type: Array, default: ['async'] },
    'css.loader': { type: String, default: 'css-loader' },
    'css.onpath': { type: [null, Function], default: null }
  });

  // Init root and base
  options.root = pResolve(options.root);
  options.base = pResolve(options.root, options.base);

  // The base out of bounds of root
  if (gutil.isOutBounds(options.base, options.root)) {
    throw new TypeError('Options.base is out bounds of options.root.');
  }

  // The base equal to root
  if (options.base === options.root) {
    throw new TypeError(`Options.base can't be equal to options.root.`);
  }

  // Assert css loader
  if (!options.css.loader) {
    throw new TypeError(`Options.css.loader must be a nonempty string.`);
  }

  // Starts with \ or /
  if (/^[\\/]/.test(options.css.loader)) {
    throw new TypeError(`Options.css.loader must be a string not starts with "\\" or "/".`);
  }

  // Init cache
  options.cache = new Map();
  // Init loaders
  options.loaders = new Set();
  // Init ignore
  options.ignore = initIgnore(options.ignore);

  // Freeze
  Object.freeze(options);

  return options;
}

/**
 * @function moduleId
 * @description Parse module id form src
 * @param {string} src
 * @param {Object} base
 * @returns {string|null}
 */
export function moduleId(src, base) {
  // Vinyl not in base dir, user root
  if (gutil.isOutBounds(src, base)) {
    // Relative file path from cwd
    const rpath = JSON.stringify(gutil.path2cwd(src));

    // Output error
    throw new RangeError(`Module ${rpath} is out of bounds of base.`);
  }

  // Relative path from base
  const path = relative(base, src);

  // Return normalized path
  return gutil.normalize(path);
}

/**
 * @function resolveModuleId
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {string}
 */
export function resolveModuleId(vinyl, options) {
  let id;
  const path = vinyl.path;
  const base = options.base;

  try {
    id = moduleId(path, base, true);
  } catch (error) {
    // Output error message
    gutil.logger.warn(gutil.chalk.yellow(error), '\x07');

    // Return null
    return null;
  }

  // Parse map
  id = gutil.parseMap(id, path, options.map);
  id = gutil.normalize(id);
  id = hideExt(id);

  // Add ext
  if (isCSSFile(id)) {
    id = addExt(id);
  }

  return id;
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
export function wrapModule(id, deps, code, options) {
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
export function fsSafeAccess(path, mode = fs.constants.R_OK) {
  try {
    fs.accessSync(path, mode);

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
export async function loadModule(path, options) {
  // Read module
  const stat = await fsReadStat(path);
  const contents = await fsReadFile(path);

  // Return a vinyl file
  return new gutil.VinylFile({
    path,
    stat,
    contents,
    base: options.base
  });
}

export async function registerLoader(loader, id, options) {
  const cache = options.cache;
  const loaders = options.loaders;
  const contents = await fsReadFile(require.resolve(`./builtins/loaders/${loader}`));

  return contents;
}
