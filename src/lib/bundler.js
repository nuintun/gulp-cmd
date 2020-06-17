/**
 * @module bundler
 * @license MIT
 * @version 2018/03/26
 */

import parser from './parser';
import Bundler from '@nuintun/bundler';
import * as gutil from '@nuintun/gulp-util';

/**
 * @function oncycle
 * @param {string} path
 * @param {string} referrer
 */
function oncycle(path, referrer) {
  path = JSON.stringify(gutil.path2cwd(path));
  referrer = JSON.stringify(gutil.path2cwd(referrer));

  gutil.logger.error(gutil.chalk.red(`Found circular dependency ${path} in ${referrer}`), '\x07');
}

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
    oncycle,
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
      const contents = meta.contents;
      const dependencies = combine ? Array.from(meta.dependencies) : [];

      // If is entry file override file path
      if (entry) vinyl.path = path;

      // Return meta
      return { path, dependencies, contents };
    }
  }).parse(input);

  // Exec onbundle
  options.onbundle && options.onbundle(input, bundles);

  // Combine files
  vinyl.contents = gutil.combine(bundles);

  return vinyl;
}
