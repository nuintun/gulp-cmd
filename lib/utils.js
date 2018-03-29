/**
 * @module utils
 * @license MIT
 * @version 2018/03/26
 */

import fs from 'fs';
import * as gutil from '@nuintun/gulp-util';
import { resolve as pResolve, join, dirname, relative, extname } from 'path';

/**
 * @function resolve
 * @description Resolve a request path
 * @param {string} request
 * @param {string} referer
 * @param {Object} options
 * @returns {string}
 */
export function resolve(request, referer, options) {
  // Resolve
  if (gutil.isAbsolute(request)) {
    request = join(options.root, request);
  } else if (gutil.isRelative(request)) {
    request = join(dirname(referer), request);

    // Out of bounds of root
    if (gutil.isOutBounds(request, options.root)) {
      throw new RangeError(`File ${gutil.normalize(request)} is out of bounds of root.`);
    }
  } else {
    const base = options.base || dirname(referer);

    // Use base or referer dirname
    request = join(base, request);
  }

  return request;
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
 * @function fileExt
 * @param {string} path
 * @returns {string}
 */
export function fileExt(path) {
  return extname(path).toLowerCase();
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
  return path.replace(/([^/]+)\.js$/i, '$1');
}

/**
 * @function initIgnore
 * @param {Object} options
 * @return {Object}
 */
export function initIgnore(options) {
  const ignore = new Set();
  const root = options.root;
  const base = options.base;
  const alias = options.alias;
  const isUrl = gutil.isUrl;
  const isAbsolute = gutil.isAbsolute;

  options.ignore.forEach(id => {
    // Compute id
    id = parseAlias(id, alias);

    // Local id add ignore
    if (!isUrl(id)) {
      ignore.add(addExt(join(isAbsolute(id) ? root : base, id)));
    }
  });

  return ignore;
}

/**
 * @function initOptions
 * @param {Object} options
 * @returns {Object}
 */
export function initOptions(options) {
  options = gutil.inspectAttrs(options, {
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

  // Assert css loader
  if (!options.css.loader) {
    throw new TypeError(`Options.css.loader must be a nonempty string.`);
  }

  // Init cache
  options.cache = new Map();
  // Init loaders
  options.loaders = new Map();
  // Init ignore
  options.ignore = initIgnore(options);

  // Freeze
  options.js = Object.freeze(options.js);
  options.css = Object.freeze(options.css);

  // Freeze
  return Object.freeze(options);
}

/**
 * @function moduleId
 * @description Parse module id form src
 * @param {string} src
 * @param {Object} base
 * @returns {string|null}
 */
export function moduleId(src, options) {
  const root = options.root;

  // Vinyl not in base dir, user root
  if (gutil.isOutBounds(src, root)) {
    // Stringify file path
    const fpath = JSON.stringify(gutil.normalize(src));

    // Output error
    throw new RangeError(`Module ${fpath} is out of bounds of root.`);
  }

  const base = options.base;
  const isOutBase = gutil.isOutBounds(src, base);
  const repath = relative(isOutBase ? root : base, src);
  const id = gutil.normalize(join(isOutBase ? '/' : '', repath));

  // Return id
  return id;
}

/**
 * @function resolveModuleId
 * @param {string} src
 * @param {Object} options
 * @returns {string|null}
 */
export function resolveModuleId(src, options) {
  let id = null;
  const base = options.base;

  // Parse module id
  id = moduleId(src, options);
  // Parse map
  id = gutil.parseMap(id, src, options.map);
  id = gutil.normalize(id);
  id = hideExt(id);

  // Add ext
  if (fileExt(id) === '.css') id = addExt(id);

  return id;
}

const LINEFEED_RE = /[\r\n]+/g;

/**
 * @function wrapModule
 * @param {string} id
 * @param {Array|Set} deps
 * @param {string|Buffer} code
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
 * @returns {boolean}
 */
export function fsSafeAccess(path, mode = fs.constants.R_OK) {
  try {
    fs.accessSync(path, mode);
  } catch (error) {
    return false;
  }

  return true;
}

/**
 * @function loadModule
 * @param {string} path
 * @param {Object} options
 * @returns {Vinyl}
 */
export async function loadModule(path, options) {
  // Read module
  const base = options.base;
  const stat = await fsReadStat(path);
  const contents = await fsReadFile(path);

  // Return a vinyl file
  return new gutil.VinylFile({ base, path, stat, contents });
}

/**
 * @function registerLoader
 * @param {string} loader
 * @param {string} id
 * @param {Object} options
 * @returns {object}
 */
export async function registerLoader(loader, id, options) {
  const loaders = options.loaders;

  if (loaders.has(loader)) return loaders.get(loader);

  // Normalize id
  id = gutil.normalize(id);

  // If id end with /, use index.js
  if (id.endsWith('/')) dependency += 'index.js';

  // Add ext
  id = fileExt(id) === '.js' ? id : addExt(id);

  const root = options.root;
  const base = options.base;
  const cache = options.cache;
  const dependencies = new Set();
  const plugins = options.plugins;
  const path = join(gutil.isAbsolute(id) ? root : base, id);

  // Resolve module id
  id = resolveModuleId(path, options);

  const fpath = require.resolve(`./builtins/loaders/${loader}`);
  const stat = await fsReadStat(fpath);
  let contents = await fsReadFile(fpath);

  // Execute transform hook
  contents = await gutil.pipeline(plugins, 'transform', path, contents, { root, base });
  // Wrap module
  contents = wrapModule(id, dependencies, contents, options);
  // Execute bundle hook
  contents = await gutil.pipeline(plugins, 'bundle', path, contents, { root, base });

  const vinyl = new gutil.VinylFile({ base, path, stat, contents });

  // Set cache
  loaders.set(loader, { id, path, vinyl });
  cache.set(path, { path, dependencies, contents });

  // Return meta
  return { id, path, vinyl };
}
