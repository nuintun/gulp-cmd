/**
 * @module transform
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const Visitor = require('./visitor');
const through = require('@nuintun/through');
const gutil = require('@nuintun/gulp-util');

const join = path.join;
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
  utils.debug('cwd: %P', gutil.cwd);

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

    // Get relative from cwd
    const path = vinyl.path;

    // Transport
    utils
      .transport(vinyl, options)
      .then(vinyl => {
        const start = gutil.blankVinyl(vinyl);
        const end = gutil.blankVinyl(vinyl);

        // Set start and end file status
        start.concat = gutil.CONCAT_STATUS.START;
        end.concat = gutil.CONCAT_STATUS.END;

        // Debug
        utils.debug('concat: %r start', path);

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
            utils.debug('concat: %r ...ok', path);

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
