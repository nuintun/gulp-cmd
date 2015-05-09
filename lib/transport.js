/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var util = require('./util');
var plugins = require('./plugins/');
var extname = require('path').extname;

module.exports = function (vinyl, options){
  var parsers = initParsers(options);
  var parser = chooseParser(parsers);

  return parser(vinyl, options)
};

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

function chooseParser(parsers){
  return function (file){
    var ext = extname(file.path);

    switch (ext) {
      case '.js':
      case '.css':
      case '.tpl':
      case '.json':
      case '.html':
        return parsers.defined[ext];
      default :
        return parsers.other;
    }
  };
}