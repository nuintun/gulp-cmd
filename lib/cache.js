/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var util = require('./util');
var crypto = require('crypto');
var crc32 = require('crc').crc32;

var caches = {};
var NULL = new Buffer([0]);

function statHash(stat, weak){
  var mtime = stat.mtime.toISOString();
  var size = stat.size.toString(16);

  if (weak) {
    return 'W/"' + size + '-' + crc32(mtime) + '"';
  }

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

function cache(vinyl, options){
  options = util.extend({ optimizeMemory: false }, options);

  var hash = statHash(vinyl.stat, options.optimizeMemory);

  var cached = caches[vinyl.path];

  // hit
  if (cached && cached.hash === hash) {
    return cached.vinyl;
  }

  // miss - add it and pass it through
  caches[vinyl.path] = {
    hash: hash,
    vinyl: vinyl
  };

  return vinyl;
}

cache.clear = function (path){
  if (arguments.length) {
    delete caches[path];
  } else {
    caches = {};
  }
};

module.exports = cache;