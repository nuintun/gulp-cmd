/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var util = require('./util');

var caches = {};
var cache = {
  'get': function (vinyl){
    var hash = vinyl.hash;
    var cached = caches[vinyl.path];

    // hit
    if (cached && cached.hash === hash) {
      return cached;
    }

    return null;
  },
  'set': function (vinyl){
    caches[vinyl.path] = vinyl;
  },
  clear: function (path){
    if (arguments.length) {
      delete caches[path];
    } else {
      caches = {};
    }
  }
};

/**
 * Exports module.
 */

module.exports = cache;