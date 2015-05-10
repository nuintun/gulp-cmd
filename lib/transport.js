/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var hash = require('./hash');
var util = require('./util');
var cache = require('./cache');
var plugins = require('./plugins/');
var extname = require('path').extname;

function transport(vinyl, options){
  // set hash
  vinyl.hash = hash(vinyl.stat);
  // get cache
  var cached = cache.get(vinyl);

  // if not cached, parse file
  if (cached === null) {
    var parsers = initParsers(options);
    var parser = chooseParser(vinyl, parsers);

    // parse file
    vinyl = parser(vinyl, options);

    // cache file
    cache.set(vinyl);
  } else {
    vinyl = cached;
  }

  return vinyl;
}

function initParsers(options){
  var defaults = {
    '.js': plugins.js,
    '.css': plugins.css,
    '.tpl': plugins.tpl,
    '.json': plugins.json,
    '.html': plugins.html
  };

  var parser;
  var parsers = options.parsers || {};
  var ret = { defined: {}, other: plugins.other };

  for (var key in defaults) {
    if (defaults.hasOwnProperty(key)) {
      if (parsers.hasOwnProperty(key)) {
        parser = parsers[key];

        if (is.fn(parser)) {
          parser = parser(options);
        }

        if (!is.fn(parser)) {
          throw new PluginError('options.parsers[' + key + '] value should be function.');
        }
      } else {
        parser = defaults[key];
      }

      ret.defined[key] = parser;
    }
  }

  return ret;
}

function chooseParser(vinyl, parsers){
  var ext = extname(vinyl.path);
  var parser = parsers.defined[ext];

  return parser || parsers.other;
}

/**
 * Exports module.
 */

module.exports = transport;