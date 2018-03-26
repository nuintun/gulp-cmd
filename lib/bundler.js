/**
 * @module bundler
 * @license MIT
 * @version 2018/03/26
 */

import * as utils from './utils';
import Bundler from '@nuintun/bundler';
import * as gutil from '@nuintun/gulp-util';
import * as packagers from './builtins/packagers/index';

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
    const path = meta.path;

    return { path, dependencies, contents };
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
export default async function bundler(vinyl, options) {
  const input = vinyl.path;
  const root = options.root;
  const base = options.base;
  const cache = options.cache;
  const plugins = options.plugins;
  const cacheable = options.combine;

  // Bundler
  const bundles = await new Bundler({
    input,
    resolve: path => path,
    parse: async path => {
      let meta;
      // Is entry file
      const isEntryFile = input === path;

      // Hit cache
      if (cacheable && cache.has(path)) {
        meta = cache.get(path);
      } else {
        const file = isEntryFile ? vinyl : await utils.loadModule(path, options);

        // Execute transform hook
        file.contents = await gutil.pipeline(plugins, 'transform', file.path, file.contents, { root, base });

        // Execute parse
        meta = await parse(file, options);

        // Execute bundle hook
        meta.contents = await gutil.pipeline(plugins, 'bundle', meta.path, meta.contents, { root, base });
      }

      // Set cache if combine is true
      if (cacheable) cache.set(path, meta);
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
