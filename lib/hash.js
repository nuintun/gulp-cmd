/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var NULL = new Buffer([0]);
var crypto = require('crypto');

function hash(stat){
  var mtime = stat.mtime.toISOString();
  var size = stat.size.toString(16);

  var hash = crypto
    .createHash('md5')
    .update('file', 'utf8')
    .update(NULL)
    .update(size, 'utf8')
    .update(NULL)
    .update(mtime, 'utf8')
    .digest('base64');

  return '"' + hash + '"';
}

/**
 * exports module.
 */
module.exports = hash;
