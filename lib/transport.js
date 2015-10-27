/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var hash = require('./hash');
var cache = require('./cache');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;
var extname = require('path').extname;

/**
 * transport
 * @param vinyl
 * @param options
 * @param done
 * @returns {*}
 */
function transport(vinyl, options, done){
  if (options.cache) {
    // set hash
    vinyl.hash = hash(vinyl.stat);
    // get cache
    var cached = cache.get(vinyl);

    // if not cached, parse vinyl
    if (cached === null) {
      parse(vinyl, options, function (vinyl, options){
        // cache vinyl
        cache.set(vinyl);

        done(vinyl, options);
      });
    } else {
      vinyl = cached;

      // debug
      debug('read file: %s from cache', colors.magenta(util.pathFromCwd(vinyl.path)));

      done(vinyl, options);
    }
  } else {
    parse(vinyl, options, done);
  }
}

function parse(vinyl, options, done){
  var ext = extname(vinyl.path);
  var plugins = options.plugins;
  var plugin = plugins[ext.substring(1)] || plugins.other;

  // parse vinyl
  return plugin.exec(vinyl, options, done);
}

/**
 * exports module
 */
module.exports = transport;
