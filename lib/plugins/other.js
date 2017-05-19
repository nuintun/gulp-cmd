/**
 * Created by nuintun on 2015/5/9.
 */

'use strict';

/**
 * transport
 *
 * @param vinyl
 * @param options
 * @param next
 * @returns {void}
 */
module.exports = function transport(vinyl, options, next) {
  this.push(vinyl);
  next();
};
