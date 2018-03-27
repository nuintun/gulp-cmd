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
const cssDeps = require('@nuintun/css-deps');
const Bundler = require('@nuintun/bundler');
const through = require('@nuintun/through');

/**
 * @module utils
 * @license MIT
 * @version 2018/03/26
 */

/**
 * @function resolve
 * @description Resolve a request path
 * @param {string} request
 * @param {string} referer
 * @param {Object} options
 * @returns {string}
 */
function resolve(request, referer, options) {
  // Resolve
  if (gutil.isAbsolute(request)) {
    request = path.join(options.root, request);
  } else if (gutil.isRelative(request)) {
    request = path.join(path.dirname(referer), request);

    // Out of bounds of root
    if (gutil.isOutBounds(request, options.root)) {
      throw new RangeError(`File ${gutil.normalize(request)} is out of bounds of root.`);
    }
  } else {
    const base = options.base || path.dirname(referer);

    // Use base or referer dirname
    request = path.join(base, request);
  }

  return request;
}

/**
 * @function parseAlias
 * @param {string} id
 * @param {Object} alias
 * @returns {string}
 */
function parseAlias(id, alias) {
  return alias && gutil.typpy(alias[id], String) ? alias[id] : id;
}

/**
 * @function isJSFile
 * @param {string} path
 * @returns {boolean}
 */
function isJSFile(path$$1) {
  return /[^\\/]+\.js$/i.test(path$$1);
}

/**
 * @function isCSSFile
 * @param {string} path
 * @returns {boolean}
 */
function isCSSFile(path$$1) {
  return /[^\\/]+\.css$/i.test(path$$1);
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
 * @function hideExt
 * @description Hide .js if exists
 * @param {string} path
 * @returns {string}
 */
function hideExt(path$$1) {
  return path$$1.replace(/\.js$/i, '');
}

/**
 * @function initIgnore
 * @param {Object} options
 * @return {Object}
 */
function initIgnore(options) {
  const ignore = new Set();
  const root = options.root;
  const base = options.base;
  const alias = options.alias;
  const isLocal = gutil.isLocal;
  const isAbsolute = gutil.isAbsolute;

  options.ignore.forEach(id => {
    // Compute id
    id = parseAlias(id, alias);

    // Local id add ignore
    if (isLocal(id)) {
      ignore.add(addExt(path.join(isAbsolute(id) ? root : base, id)));
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
  options.root = path.resolve(options.root);
  options.base = path.resolve(options.root, options.base);

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
function moduleId(src, options) {
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
  const repath = path.relative(isOutBase ? root : base, src);
  const id = gutil.normalize(path.join(isOutBase ? '/' : '', repath));

  // Return id
  return id;
}

/**
 * @function resolveModuleId
 * @param {string} src
 * @param {Object} options
 * @returns {string}
 */
function resolveModuleId(src, options) {
  let id;
  const base = options.base;

  try {
    id = moduleId(src, options);
  } catch (error) {
    // Output error message
    gutil.logger.warn(gutil.chalk.yellow(error), '\x07');

    // Return null
    return null;
  }

  // Parse map
  id = gutil.parseMap(id, src, options.map);
  id = gutil.normalize(id);
  id = hideExt(id);

  // Add ext
  if (isCSSFile(id)) id = addExt(id);

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
 * @returns {boolean}
 */
function fsSafeAccess(path$$1, mode = fs.constants.R_OK) {
  try {
    fs.accessSync(path$$1, mode);
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
async function loadModule(path$$1, options) {
  // Read module
  const base = options.base;
  const stat = await fsReadStat(path$$1);
  const contents = await fsReadFile(path$$1);

  // Return a vinyl file
  return new gutil.VinylFile({ base, path: path$$1, stat, contents });
}

/**
 * @function registerLoader
 * @param {string} loader
 * @param {string} id
 * @param {Object} options
 * @returns {object}
 */
async function registerLoader(loader, id, options) {
  const loaders = options.loaders;

  if (loaders.has(loader)) return loaders.get(loader);

  // Normalize id
  id = gutil.normalize(id);

  // If id end with /, use index.js
  if (id.endsWith('/')) dependency += 'index.js';

  // Add ext
  id = isJSFile(id) ? id : addExt(id);

  const root = options.root;
  const base = options.base;
  const cache = options.cache;
  const dependencies = new Set();
  const plugins = options.plugins;
  const path$$1 = path.join(gutil.isAbsolute(id) ? root : base, id);

  // Resolve module id
  id = resolveModuleId(path$$1, options);

  const rpath = require.resolve(`./builtins/loaders/${loader}`);
  const stat = await fsReadStat(rpath);
  let contents = await fsReadFile(rpath);

  // Execute transform hook
  contents = await gutil.pipeline(plugins, 'transform', path$$1, contents, { root, base });
  // Wrap module
  contents = wrapModule(id, dependencies, contents, options);
  // Execute bundle hook
  contents = await gutil.pipeline(plugins, 'bundle', path$$1, contents, { root, base });

  const vinyl = new gutil.VinylFile({ base, path: path$$1, stat, contents });

  // Set cache
  loaders.set(loader, { id, path: path$$1, vinyl });
  cache.set(path$$1, { path: path$$1, dependencies, contents });

  // Return meta
  return { id, path: path$$1, vinyl };
}

/**
 * @module js
 * @license MIT
 * @version 2018/03/26
 */

/**
 * @function jsPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
function jsPackager(vinyl, options) {
  const deps = new Set();
  const root = options.root;
  const base = options.base;
  const referer = vinyl.path;
  const ignore = options.ignore;
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
          // Module can read
          if (fsSafeAccess(resolved)) {
            !ignore.has(resolved) && dependencies.add(resolved);
          } else {
            // Module can't read, add ext .js test again
            resolved = addExt(resolved);

            // Module can read
            if (fsSafeAccess(resolved)) {
              !ignore.has(resolved) && dependencies.add(resolved);
            } else {
              // Relative referer from cwd
              const rpath = JSON.stringify(gutil.path2cwd(referer));

              // Output warn
              gutil.logger.warn(
                gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`),
                '\x07'
              );
            }
          }
        }

        // Parse map
        dependency = gutil.parseMap(dependency, resolved, options.map);
        dependency = gutil.normalize(dependency);
        dependency = hideExt(dependency);

        // The seajs has hacked css before 3.0.0
        // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
        // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
        if (isCSSFile(dependency)) dependency = addExt(dependency);

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
  const id = resolveModuleId(vinyl.path, options);
  // Get contents
  const contents = id ? wrapModule(id, deps, meta.code, options) : vinyl.contents;
  // Rewrite path
  const path$$1 = referer;

  return { path: path$$1, dependencies, contents };
}

/**
 * @module css
 * @license MIT
 * @version 2018/03/26
 */

/**
 * @function cssPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
async function cssPackager(vinyl, options) {
  const root = options.root;
  const referer = vinyl.path;
  const ignore = options.ignore;
  const loader = await registerLoader('css', options.css.loader, options);
  const loaderId = loader.id;
  const loaderPath = loader.path;
  const deps = new Set([loaderId]);
  let requires = `var loader = require(${JSON.stringify(loaderId)});\n\n`;
  const dependencies = new Set(ignore.has(loaderPath) ? [] : [loaderPath]);

  // Normalize onpath
  const onpath = options.onpath ? (prop, value) => options.onpath(prop, value, referer) : null;

  // Parse module
  const meta = cssDeps(
    vinyl.contents,
    (dependency, media) => {
      if (gutil.isLocal(dependency)) {
        if (media.length) {
          // Get media
          media = JSON.stringify(media.join(', '));

          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(referer));

          // Output warn
          gutil.logger.warn(
            gutil.chalk.yellow(`Found import media queries ${media} at ${rpath}, unsupported.`),
            '\x07'
          );
        }

        // Resolve dependency
        let resolved = resolve(dependency, referer, { root });

        // Module can read
        if (fsSafeAccess(resolved)) {
          !ignore.has(resolved) && dependencies.add(resolved);
        } else {
          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(referer));

          // Output warn
          gutil.logger.warn(
            gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`),
            '\x07'
          );
        }

        // Use css resolve rule
        if (!gutil.isRelative(dependency)) dependency = `./${dependency}`;

        // Parse map
        dependency = gutil.parseMap(dependency, resolved, options.map);
        dependency = gutil.normalize(dependency);
        // The seajs has hacked css before 3.0.0
        // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
        // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
        dependency = addExt(dependency);

        // Add dependency
        deps.add(dependency);

        requires += `require(${JSON.stringify(dependency)});\n`;
      } else {
        // Relative file path from cwd
        const rpath = JSON.stringify(gutil.path2cwd(referer));

        // Output warn
        gutil.logger.warn(
          gutil.chalk.yellow(`Found remote css file ${JSON.stringify(dependency)} at ${rpath}, unsupported.`),
          '\x07'
        );
      }

      return false;
    },
    { onpath, media: true }
  );

  if (deps.size > 1) requires += '\n';

  const id = resolveModuleId(vinyl.path, options);
  const code = `${requires}loader(${JSON.stringify(meta.code)});`;
  const contents = id ? wrapModule(id, deps, code, options) : vinyl.contents;
  const path$$1 = addExt(referer);

  return { path: path$$1, dependencies, contents };
}

/**
 * @module json
 * @license MIT
 * @version 2018/03/26
 */

/**
 * @function jsonPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
function jsonPackager(vinyl, options) {
  const root = options.root;
  const referer = vinyl.path;
  const dependencies = new Set();
  const id = resolveModuleId(vinyl.path, options);
  const code = `module.exports = ${vinyl.contents.toString()};`;
  const contents = id ? wrapModule(id, dependencies, code, options) : vinyl.contents;
  const path$$1 = addExt(referer);

  return { path: path$$1, dependencies, contents };
}

/**
 * @module html
 * @license MIT
 * @version 2018/03/26
 */

/**
 * @function htmlPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
function htmlPackager(vinyl, options) {
  const root = options.root;
  const referer = vinyl.path;
  const dependencies = new Set();
  const id = resolveModuleId(vinyl.path, options);
  const code = `module.exports = ${JSON.stringify(vinyl.contents.toString())};`;
  const contents = id ? wrapModule(id, dependencies, code, options) : vinyl.contents;
  const path$$1 = addExt(referer);

  return { path: path$$1, dependencies, contents };
}

/**
 * @module index
 * @license MIT
 * @version 2018/03/26
 */

const packagers = /*#__PURE__*/(Object.freeze || Object)({
  html: htmlPackager,
  tpl: htmlPackager,
  js: jsPackager,
  css: cssPackager,
  json: jsonPackager
});

/**
 * @module bundler
 * @license MIT
 * @version 2018/03/26
 */

/**
 * @function parse
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
async function parse(vinyl, options) {
  const ext = vinyl.extname.slice(1);
  const packager = packagers[ext.toLowerCase()];

  if (packager) {
    const cacheable = options.combine;
    const meta = await packager(vinyl, options);
    const dependencies = cacheable ? meta.dependencies : new Set();
    const contents = meta.contents;
    const path$$1 = meta.path;

    return { path: path$$1, dependencies, contents };
  }

  return {
    path: vinyl.path,
    dependencies: new Set(),
    contents: vinyl.contents
  };
}

/**
 * @function combine
 * @param {Set} bundles
 * @returns {Buffer}
 */
function combine(bundles) {
  const contents = [];

  // Traverse bundles
  bundles.forEach(bundle => {
    contents.push(bundle.contents);
  });

  // Concat contents
  return Buffer.concat(contents);
}

/**
 * @function bundler
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl}
 */
async function bundler(vinyl, options) {
  const input = vinyl.path;
  const root = options.root;
  const base = options.base;
  const cache = options.cache;
  const plugins = options.plugins;
  const cacheable = options.combine;

  // Bundler
  const bundles = await new Bundler({
    input,
    resolve: path$$1 => path$$1,
    parse: async path$$1 => {
      let meta;
      // Is entry file
      const isEntryFile = input === path$$1;

      // Hit cache
      if (cacheable && cache.has(path$$1)) {
        meta = cache.get(path$$1);
      } else {
        const file = isEntryFile ? vinyl : await loadModule(path$$1, options);

        // Execute transform hook
        file.contents = await gutil.pipeline(plugins, 'transform', file.path, file.contents, { root, base });

        // Execute parse
        meta = await parse(file, options);

        // Execute bundle hook
        meta.contents = await gutil.pipeline(plugins, 'bundle', meta.path, meta.contents, { root, base });
      }

      // Set cache if combine is true
      if (cacheable) cache.set(path$$1, meta);
      // If is entry file override file path
      if (isEntryFile) vinyl.path = meta.path;

      // Get dependencies and contents
      const dependencies = meta.dependencies;
      const contents = meta.contents;

      // Return meta
      return { dependencies, contents };
    }
  });

  // Combine files
  vinyl.contents = combine(bundles);

  return vinyl;
}

/**
 * @module index
 * @license MIT
 * @version 2018/03/26
 */

/**
 * @function main
 * @param {Object} options
 */
function main(options) {
  options = initOptions(options);

  const cache = options.cache;
  const ignore = options.ignore;
  const loaders = options.loaders;
  const cacheable = options.combine;

  // Stream
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

      // Next
      try {
        next(null, await bundler(vinyl, options));
      } catch (error) {
        next(error);
      }
    },
    function(next) {
      loaders.forEach(loader => {
        if (!cacheable || ignore.has(loader.path)) {
          this.push(loader.vinyl);
        }
      });

      // Clear cache
      cache.clear();

      // Next
      next();
    }
  );
}

// Exports
main.chalk = gutil.chalk;
main.logger = gutil.logger;

module.exports = main;
