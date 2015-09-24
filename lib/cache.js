/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var util = require('./util');

var cache = {};
var caches = {};

/**
 * get cache
 * @param vinyl
 * @returns {*}
 */
cache.get = function (vinyl){
  var hash = vinyl.hash;
  var cached = caches[vinyl.path];

  // hit
  if (cached && cached.hash === hash) {
    return cached;
  }

  return null;
};

/**
 * set cache
 * @param vinyl
 */
cache.set = function (vinyl){
  caches[vinyl.path] = vinyl;
};

/**
 * clean cache
 * @param path
 */
cache.clean = function (path){
  if (arguments.length) {
    delete caches[path];
  } else {
    caches = {};
  }
};

/**
 * exports module.
 */
module.exports = cache;
