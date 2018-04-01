/**
 * @module bundler
 * @license MIT
 * @version 2018/03/26
 */

import parser from './parser';
import Bundler from '@nuintun/bundler';
import * as gutil from '@nuintun/gulp-util';

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

  // Bundler
  const bundles = await new Bundler({
    input,
    resolve: path => path,
    parse: async path => {
      let meta;
      // Is entry file
      const entry = input === path;

      // Hit cache
      if (cache.has(path)) {
        meta = cache.get(path);
      } else {
        const file = entry ? vinyl : await gutil.fetchModule(path, options);

        // Execute parser
        meta = await parser(file, options);

        // Set cache
        cache.set(path, meta);
      }

      // If is entry file override file path
      if (entry) vinyl.path = meta.path;

      // Return meta
      return meta;
    }
  });

  // Combine files
  vinyl.contents = gutil.combine(bundles);

  return vinyl;
}
