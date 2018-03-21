/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

import bundler from './lib/bundler';
import * as utils from './lib/utils';
import through from '@nuintun/through';
import * as gutil from '@nuintun/gulp-util';

export default function main(options) {
  options = utils.initOptions(options);

  const loaders = new Set();
  const cache = options.cache;
  const ignore = options.ignore;
  const cacheable = options.combine;

  // Init loaders
  ['css'].forEach(ext => {
    const id = options[ext].loader;

    loaders.add(utils.initLoader(id, ext, options));
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
