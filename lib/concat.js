/*!
 * concat
 *
 * Date: 2017/07/11
 * https://github.com/nuintun/gulp-cmd
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-cmd/blob/master/LICENSE
 */

'use strict';

var gutil = require('@nuintun/gulp-util');
var through = require('@nuintun/through');

/**
 * concat
 *
 * @returns {Stream}
 */
module.exports = function() {
  var code = [];

  return through(function(vinyl, encoding, next) {
    // throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    var concat = vinyl.concat;

    // start concat
    if (vinyl.concat === gutil.CONCAT_STATUS.START) {
      return next();
    }

    // end concat
    if (vinyl.concat === gutil.CONCAT_STATUS.END) {
      vinyl.contents = Buffer.concat(code);

      // clean vinyl
      delete vinyl.concat;

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
