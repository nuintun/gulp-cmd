/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var util = require('./util');
var through = require('through2');
var plugins = require('./plugins/');
var duplexer = require('duplexer2');
var extname = require('path').extname;
var streamSwitch = require('./stream-switch');

module.exports = function (options){
  var input = through.obj();
  var output = through.obj();
  var streams = getStream(options);
  var difined = parseByType(streams);
  var other = streams.other;

  input
    .pipe(chooseParseType(difined, other))
    .pipe(output);

  function error(stream){
    stream.on('error', function (e){
      output.emit('error', e);
    });
  }

  error(difined);
  error(other);

  return duplexer(input, output);
};

function getStream(options){
  var defaults = {
    '.js': plugins.js(options),
    '.css': plugins.css(options),
    '.tpl': plugins.tpl(options),
    '.json': plugins.json(options),
    '.html': plugins.html(options)
  };

  var stream;
  var streams = options.streams || {};
  var ret = { defined: {}, other: plugins.other() };

  for (var key in defaults) {
    if (defaults.hasOwnProperty(key)) {
      if (streams.hasOwnProperty(key)) {
        stream = streams[key];

        if (is.fn(stream)) {
          stream = stream(options);
        }

        if (!gutil.isStream(stream)) {
          throw new PluginError('options.streams[' + key + '] value should be stream.');
        }
      } else {
        stream = defaults[key];
      }

      ret.defined[key] = stream;
    }
  }

  return ret;
}

function chooseParseType(defined, other){
  return streamSwitch(function (file){
    switch (extname(file.path)) {
      case '.js':
      case '.css':
      case '.tpl':
      case '.json':
      case '.html':
        return 'defined';
      default :
        return 'other'
    }
  }, {
    'defined': defined,
    'other': other
  });
}

function parseByType(streams){
  return streamSwitch(function (file){
    return extname(file.path);
  }, streams.defined);
}