/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var util = require('./util');
var mixarg = require('mixarg');
var through = require('through2');
var plugins = require('./plugins/');
var duplexer = require('duplexer2');
var extname = require('path').extname;
var multipipe = require('./multipipe');
var streamSwitch = require('./stream-switch');

var defaults = {
  alias: {},
  idleading: '{{name}}/{{version}}/{{file}}'
};

module.exports = function (options){
  options = mixarg({}, defaults, options);

  var inputStream = through.obj();
  var outputStream = through.obj();
  var streams = getStream(options);
  var jsStream = parseByType(streams);
  var cssStream = streams.css;

  inputStream
    .pipe(chooseParseType(jsStream, cssStream, options))
    .pipe(outputStream);

  function errorHandle(stream){
    stream.on('error', function (e){
      outputStream.emit('error', e);
    });
  }

  errorHandle(jsStream);
  errorHandle(cssStream);

  return duplexer(inputStream, outputStream);
};

function getStream(options){
  var defaultStream = {
    '.js': plugins.js(options),
    '.css': plugins.css(options),
    '.tpl': plugins.tpl(options),
    '.json': plugins.json(options),
    '.html': plugins.html(options),
    '.css.js': plugins.css(options).pipe(plugins.css2js(options))
  };

  var stream = options.stream || {}, ret = { other: {} };

  Object.keys(defaultStream).forEach(function (key){
    var func = stream[key];

    if (func && typeof func !== 'function') {
      throw new Error('options.stream\'s value should be function');
    }

    var val = func ? func(options) : defaultStream[key];

    if (key === '.css' || key === '.js') {
      ret[key.substring(1)] = val;
    } else {
      ret.other[key] = val;
    }
  });

  return ret;
}

function chooseParseType(jsStream, cssStream, options){
  return streamSwitch(function (file){
    var ext = extname(file.path);

    switch (ext) {
      case '.js':
      case '.tpl':
      case '.json':
      case '.html':
        return '.js';
      case '.css':
        return options.css2js ? '.js' : '.css';
    }
  }, {
    '.js': jsStream,
    '.css': cssStream
  });
}

function parseByType(streams){
  return streamSwitch(function (file){
    var ext = extname(file.path);

    return ext === '.css' ? '.css.js' : ext;
  }, streams.other);
}