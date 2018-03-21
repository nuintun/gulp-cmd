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
 *
 * @param {string} id
 * @param {string} ext
 * @param {Object} options
 * @returns {Vinyl}
 */
function initLoader(id, ext, options) {
  // Assert id
  if (!id || !gutil.isString(id)) {
    throw new TypeError(`The options.${ext}.loader must be a nonempty string.`);
  }

  // Starts with \ or /
  if (/^[\\/]/.test(id)) {
    throw new TypeError(`The options.${ext}.loader must be a string not starts with "\\" or "/".`);
  }

  // Resolve path
  const path$$1 = path.join(options.base, isJSFile(id) ? id : addExt(id));

  // Parse map
  id = gutil.parseMap(id, path$$1, options.map);
  id = gutil.normalize(id);
  id = hideExt(id);

  // Get real path
  const rpath = require.resolve(`./builtins/loaders/${ext}`);
  // Read module
  const dependencies = new Set();
  const stat = fs.statSync(rpath);
  const contents = wrapModule(id, dependencies, fs.readFileSync(rpath), options);

  if (options.combine) {
    options.cache.set(path$$1, { dependencies, contents });
  }

  // Rewrite value
  options[ext].loader = { id, path: path$$1 };

  // Return a vinyl file
  return new gutil.VinylFile({
    path: path$$1,
    stat,
    contents,
    base: options.base
  });
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

  // Init root dir
  gutil.readonly(options, 'root', path.resolve(gutil.isString(options.root) ? options.root : ''));

  // Option base must be string
  if (!gutil.isString(options.base)) {
    throw new TypeError(`The options.base's value must be a string.`);
  }

  // Init base dir
  gutil.readonly(options, 'base', path.resolve(options.root, options.base));

  // The base out of bounds of root
  if (gutil.isOutBounds(options.base, options.root)) {
    throw new TypeError('The options.base is out bounds of options.root.');
  }

  // The base equal to root
  if (options.base === options.root) {
    throw new TypeError(`The options.base can't be equal to options.root.`);
  }

  // Init plugins
  gutil.readonly(options, 'plugins', Array.isArray(options.plugins) ? options.plugins : []);

  // Init js settings
  options.js = options.js || { flags: ['async'] };

  // Init js flags
  if (!Array.isArray(options.js.flags)) {
    options.js.flags = ['async'];
  }

  // Init css settings
  options.css = options.css || { onpath: null, loader: 'css-loader' };

  // Init css onpath
  if (options.css.onpath && !gutil.isFunction(options.css.onpath)) {
    options.css.onpath = null;
  }

  // Init ignore
  options.ignore = initIgnore(options);

  // Init indent
  options.indent = Math.min(10, Math.max(0, options.indent >> 0));

  // Init cache
  gutil.readonly(options, 'cache', new Map());

  return options;
}

/**
 * @function moduleId
 * @description Parse module id form src
 * @param {string} src
 * @param {Object} base
 * @returns {string|null}
 */
function moduleId(src, base) {
  // Vinyl not in base dir, user root
  if (gutil.isOutBounds(src, base)) {
    // Relative file path from cwd
    const rpath = JSON.stringify(gutil.path2cwd(src));

    // Output error
    throw new RangeError(`Module ${rpath} is out of bounds of base.`);
  }

  // Relative path from base
  const path$$1 = path.relative(base, src);

  // Return normalized path
  return gutil.normalize(path$$1);
}

/**
 * @function resolveModuleId
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {string}
 */
function resolveModuleId(vinyl, options) {
  let id;
  const path$$1 = vinyl.path;
  const base = options.base;

  try {
    id = moduleId(path$$1, base, true);
  } catch (error) {
    // Output error message
    gutil.logger.warn(gutil.chalk.yellow(error), '\x07');

    // Return null
    return null;
  }

  // Parse map
  id = gutil.parseMap(id, path$$1, options.map);
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
 * @module js
 * @license MIT
 * @version 2018/03/19
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

              // Output warn
              gutil.logger.warn(
                gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`),
                '\x07'
              );
            }
          }

          // Convert absolute path to relative base path
          if (gutil.isAbsolute(dependency) && dependencies.has(resolved)) {
            try {
              dependency = moduleId(resolved, base);
            } catch (error) {
              // Out of bounds of base
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
  const contents = id ? wrapModule(id, deps, meta.code, options) : vinyl.contents;
  // Rewrite path
  const path$$1 = referer;

  return { path: path$$1, dependencies, contents };
}

/**
 * @module css
 * @license MIT
 * @version 2018/03/19
 */

/**
 * @function cssPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
function cssPackager(vinyl, options) {
  const root = options.root;
  const referer = vinyl.path;
  const loader = options.css.loader;
  const deps = new Set([loader.id]);
  const dependencies = new Set([loader.path]);
  let requires = `var loader = require(${JSON.stringify(loader.id)});\n\n`;
  /**
   * @function onpath
   * @param {string} value
   * @param {string} prop
   */
  const onpath = (prop, value) => {
    if (options.onpath) {
      options.onpath(prop, value, referer);
    }
  };

  const meta = cssDeps(
    vinyl.contents,
    (dependency, media) => {
      if (gutil.isLocal(dependency)) {
        if (media.length) {
          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(referer));

          // Get media
          media = JSON.stringify(media.join(', '));

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
          dependencies.add(resolved);
        } else {
          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(referer));

          // Output warn
          gutil.logger.warn(
            gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`),
            '\x07'
          );
        }

        // Convert absolute path to relative base path
        if (gutil.isAbsolute(dependency)) {
          if (dependencies.has(resolved)) {
            try {
              dependency = moduleId(resolved, base);
            } catch (error) {
              // Out of bounds of base
            }
          }
        } else if (!gutil.isRelative(dependency)) {
          dependency = `./${dependency}`;
        }

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

  const id = resolveModuleId(vinyl, options);
  const code = `${requires}loader(${JSON.stringify(meta.code)});`;
  const contents = id ? wrapModule(id, deps, code, options) : vinyl.contents;
  const path$$1 = addExt(referer);

  return { path: path$$1, dependencies, contents };
}

/**
 * @module json
 * @license MIT
 * @version 2018/03/20
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
  const id = resolveModuleId(vinyl, options);
  const code = `module.exports = ${vinyl.contents.toString()};`;
  const contents = id ? wrapModule(id, dependencies, code, options) : vinyl.contents;
  const path$$1 = addExt(referer);

  return { path: path$$1, dependencies, contents };
}

/**
 * @module html
 * @license MIT
 * @version 2018/03/20
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
  const id = resolveModuleId(vinyl, options);
  const code = `module.exports = ${JSON.stringify(vinyl.contents.toString())};`;
  const contents = id ? wrapModule(id, dependencies, code, options) : vinyl.contents;
  const path$$1 = addExt(referer);

  return { path: path$$1, dependencies, contents };
}

/**
 * @module index
 * @license MIT
 * @version 2018/03/19
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
 * @version 2018/03/16
 */

/**
 * @function parse
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
function parse(vinyl, options) {
  const ext = vinyl.extname.slice(1);
  const packager = packagers[ext.toLowerCase()];

  if (packager) {
    const cacheable = options.combine;
    const meta = packager(vinyl, options);
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
        meta = parse(file, options);

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
 * @version 2017/11/13
 */

function main(options) {
  options = initOptions(options);

  const loaders = new Set();
  const cache = options.cache;
  const ignore = options.ignore;
  const cacheable = options.combine;

  // Init loaders
  ['css'].forEach(ext => {
    const id = options[ext].loader;

    loaders.add(initLoader(id, ext, options));
  });

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
      // Add loader to stream
      loaders.forEach(loader => {
        if (!cacheable || ignore.has(loader.path)) {
          this.push(loader);
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
