/**
 * @module bundler
 * @license MIT
 * @version 2018/03/26
 */

import parser from './parser';
import * as utils from './utils';
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
  const cacheable = options.combine;

  // Bundler
  const bundles = await new Bundler({
    input,
    resolve: path => path,
    parse: async path => {
      let meta;
      // Is entry file
      const entry = input === path;

      // Hit cache
      if (cacheable && cache.has(path)) {
        meta = cache.get(path);
      } else {
        const file = entry ? vinyl : await gutil.fetchModule(path, options);

        // Execute parser
        meta = await parser(file, options);
      }

      // If is entry file override file path
      if (entry) vinyl.path = meta.path;
      // Set cache if combine is true
      if (cacheable) cache.set(path, meta);

      // Return meta
      return meta;
    }
  });

  // Combine files
  vinyl.contents = gutil.combine(bundles);

  return vinyl;
}
