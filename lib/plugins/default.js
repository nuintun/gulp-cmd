/*!
 * plugins/other
 * Version: 0.0.1
 * Date: 2017/07/11
 * https://github.com/nuintun/gulp-cmd
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-cmd/blob/master/LICENSE
 */

'use strict';

/**
 * loader
 *
 * @param vinyl
 * @param options
 * @returns {void}
 */
module.exports = function (vinyl) {
  return new Promise(function(resolve) {
    resolve(vinyl);
  });
};
