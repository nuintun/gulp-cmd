/**
 * @module bundle
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const gutil = require('@nuintun/gulp-util');
const through = require('@nuintun/through');

/**
 * @function bundle
 * @returns {Stream}
 */
module.exports = function() {
  let code = [];

  return through(function(vinyl, encoding, next) {
    // Throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // Return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    const bundle = vinyl.bundle;

    // Start bundle
    if (bundle === gutil.BUNDLE_STATE.START) {
      return next();
    }

    // End bundle
    if (bundle === gutil.BUNDLE_STATE.END) {
      vinyl.contents = Buffer.concat(code);

      // Clean vinyl
      delete vinyl.bundle;

      this.push(vinyl);

      // Reset code value
      code = [];

      return next();
    }

    // Concat
    code.push(vinyl.contents);
    next();
  });
};
