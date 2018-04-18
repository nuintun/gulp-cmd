/**
 * @module utils
 * @license MIT
 * @version 2018/03/26
 */

import micromatch from 'micromatch';
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
 * @function isIgnoreModule
 * @param {string} module
 * @param {Object} options
 * @return {boolean}
 */
export function isIgnoreModule(module, options) {
  const cache = options.micromatch;

  if (cache.has(module)) return cache.get(module);

  const ignored = micromatch(module, options.ignore).length > 0;

  cache.set(module, ignored);

  return ignored;
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
    map: { type: Function, default: null },
    packagers: { type: Object, default: {} },
    strict: { type: Boolean, default: true },
    onbundle: { type: Function, default: null },
    combine: { type: [Boolean, Function], default: false },
    'js.flags': { type: Array, default: ['async', 'resolve'] },
    'css.onpath': { type: Function, default: null },
    'css.loader': { type: String, default: 'css-loader' }
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

  // Init files cache
  options.cache = new Map();
  // Init loaders cache
  options.loaders = new Map();
  // Init micromatch cache
  options.micromatch = new Map();
  // Init ignore
  options.ignore = Array.from(
    options.ignore.reduce((patterns, pattern) => {
      if (!patterns.has(pattern) && gutil.typpy(pattern, String)) {
        // Preserve the "!" prefix so that micromatch can use it for negation.
        const negate = pattern.startsWith('!');

        if (negate) pattern = pattern.slice(1);

        pattern = gutil.unixify(pResolve(pattern));

        if (negate) pattern = `!${pattern}`;

        patterns.add(pattern);
      }

      return patterns;
    }, new Set())
  );

  // Init combine
  const combine = options.combine;
  const fnCombine = gutil.typpy(combine, Function);

  options.combine = module => (fnCombine ? combine(module) : combine);

  // Freeze
  options.js = Object.freeze(options.js);
  options.css = Object.freeze(options.css);

  // Can not override js packager
  delete options.packagers.js;

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
  const id = (isOutBase ? '/' : '') + gutil.normalize(repath);

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
 * @param {string} code
 * @param {boolean} strict
 * @param {number} indent
 * @returns {string}
 */
export function wrapModule(id, deps, code, options) {
  const strict = options.strict;
  const indent = options.indent;

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

  return header + code + footer;
}
