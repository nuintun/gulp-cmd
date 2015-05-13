/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var hash = require('./hash');
var util = require('./util');
var cache = require('./cache');
var extname = require('path').extname;
var plugins = require('./plugins/index');

// inline plugins
var inlinePlugins = {
  '.js': plugins.js,
  '.css': plugins.css,
  '.tpl': plugins.tpl,
  '.json': plugins.json,
  '.html': plugins.html
};

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
    }
  } else {
    vinyl = parse(vinyl, options);
  }

  return vinyl;
}

function parse(vinyl, options){
  var plugins = initPlugins(options);
  var plugin = choosePlugin(vinyl, plugins);

  // parse vinyl
  return plugin(vinyl, options);
}

function initPlugins(options){
  var plugin;
  var customPlugins = options.plugins || {};
  var plugins = { defined: {}, other: inlinePlugins.other };

  for (var key in inlinePlugins) {
    if (inlinePlugins.hasOwnProperty(key)) {
      if (customPlugins.hasOwnProperty(key)) {
        plugin = customPlugins[key];

        if (is.fn(plugin)) {
          plugin = plugin(options);
        }

        if (!is.fn(plugin)) {
          util.throwError('options.plugins[' + key + '] value should be function.');
        }
      } else {
        plugin = inlinePlugins[key];
      }

      plugins.defined[key] = plugin;
    }
  }

  return plugins;
}

function choosePlugin(vinyl, plugins){
  var ext = extname(vinyl.path);
  var plugin = plugins.defined[ext];

  return plugin || plugins.other;
}

/**
 * Exports module.
 */

module.exports = transport;
