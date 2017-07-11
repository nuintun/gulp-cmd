'use strict';

var gutil = require('@nuintun/gulp-util');
var through = require('@nuintun/through');

/**
 * is concat start
 *
 * @param {Vinyl} vinyl
 * @returns {Boolean}
 */
function isStart(vinyl) {
  return vinyl.concat === gutil.CONCAT_STATUS.START;
}

/**
 * is concat end
 *
 * @param {Vinyl} vinyl
 * @returns {Boolean}
 */
function isEnd(vinyl) {
  return vinyl.concat === gutil.CONCAT_STATUS.END;
}

/**
 * concat
 *
 * @returns {Stream}
 */
module.exports = function() {
  var code = [];

  return through({ objectMode: true }, function(vinyl, encoding, next) {
    // throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // start concat
    if (isStart(vinyl)) {
      return next();
    }

    // end concat
    if (isEnd(vinyl)) {
      vinyl.contents = Buffer.concat(code);

      // clean vinyl
      delete vinyl.package;

      this.push(vinyl);

      // reset code value
      code = [];

      return next();
    }

    // concat
    code.push(vinyl.contents);
    next();
  });
};
