/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

import bundler from './lib/bundler';
import * as utils from './lib/utils';
import through from '@nuintun/through';
import gutil from '@nuintun/gulp-util';

export default function main(options) {
  options = utils.initOptions(options);

  const cache = options.cache;

  bundler(utils.initLoader('css-loader', 'css', options), options).then(vinyl => {
    console.log(vinyl.contents.toString());
  });

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

      next(null, await bundler(vinyl, options));
    },
    next => {
      cache.clear();

      next();
    }
  );
}

// Exports
main.chalk = gutil.chalk;
main.logger = gutil.logger;
