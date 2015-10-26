/**
 * Created by nuintun on 2015/5/10.
 */

'use strict';

/**
 * hash
 * @param stat
 * @returns {string}
 */
function hash(stat){
  var size = stat.size.toString(16);
  var mtime = stat.mtime.getTime().toString(16);

  return '"' + size + '-' + mtime + '"';
}

/**
 * exports module
 */
module.exports = hash;
