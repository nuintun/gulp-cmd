/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var hash = require('./hash');
var cache = require('./cache');
var extname = require('path').extname;
var util = require('./util');
var debug = util.debug;
var colors = util.colors;

function transport(vinyl, options){
  if (options.cache) {
    // set hash
    vinyl.hash = hash(vinyl.stat);
    // get cache
    var cached = cache.get(vinyl);

    // if not cached, parse vinyl
    if (cached === null) {
      vinyl = parse(vinyl, options);

      // cache vinyl
      cache.set(vinyl);
    } else {
      vinyl = cached;

      // debug
      debug('read file: %s from cache', colors.magenta(util.pathFromCwd(vinyl.path)));
    }
  } else {
    vinyl = parse(vinyl, options);
  }

  return vinyl;
}

function parse(vinyl, options){
  var ext = extname(vinyl.path);
  var plugins = options.plugins;
  var plugin = plugins[ext.substring(1)] || plugins.other;

  // parse vinyl
  return plugin(vinyl, options);
}

/**
 * exports module.
 */
module.exports = transport;
