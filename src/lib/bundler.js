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
  const cache = options.cache;

  // Is combine
  const combine = options.combine(input);

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

      // Override path
      path = meta.path;

      // Get meta
      const dependencies = combine ? meta.dependencies : new Set();
      const contents = meta.contents;

      // If is entry file override file path
      if (entry) vinyl.path = path;

      // Return meta
      return { path, dependencies, contents };
    }
  });

  // Exec onbundle
  options.onbundle && options.onbundle(input, bundles);

  // Combine files
  vinyl.contents = gutil.combine(bundles);

  return vinyl;
}
