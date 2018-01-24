/**
 * @module transform
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const path = require('path');
const utils = require('./utils');
const Visitor = require('./visitor');
const through = require('@nuintun/through');
const gutil = require('@nuintun/gulp-util');

const relative = path.relative;

/**
 * @function include
 * @param {Object} options
 * @returns {Stream}
 */
module.exports = function(options) {
  options = utils.initOptions(options);

  const base = relative(options.wwwroot, options.base);

  // Debug
  utils.debug('cwd %P', gutil.cwd);

  // Stream
  return through(function(vinyl, encoding, next) {
    vinyl = gutil.wrapVinyl(vinyl);

    // Rewrite vinyl base
    vinyl.base = base;

    // Throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // Return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // Get path
    const path = vinyl.path;

    // Transport
    utils
      .transport(vinyl, options)
      .then(vinyl => {
        const start = gutil.blankVinyl(vinyl);
        const end = gutil.blankVinyl(vinyl);

        // Set start and end file status
        start.bundle = gutil.BUNDLE_STATE.START;
        end.bundle = gutil.BUNDLE_STATE.END;

        // Debug
        utils.debug('bundle %r start', path);

        // Push start blank vinyl
        this.push(start);

        // Visitor
        const visitor = new Visitor(options);

        // Traverse vinyl
        visitor.traverse(
          vinyl,
          vinyl => {
            // Push vinyl
            this.push(vinyl);
          },
          () => {
            // Push end blank vinyl
            this.push(end);

            // Debug
            utils.debug('bundle %r ...ok', path);

            // Next
            next();
          }
        );
      })
      .catch(error => {
        utils.print(gutil.chalk.reset.red.bold(gutil.inspectError(error)) + '\x07');
      });
  });
};
