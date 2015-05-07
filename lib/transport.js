/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var extname = require('path').extname;
var mixarg = require('mixarg');
var through = require('through2');
var duplexer2 = require('duplexer2');
var multipipe = require('multipipe');
var gulpswitch = require('stream-switch');
var plugins = require('./plugins/');
var util = require('./util');

var defaults = {
  alias: {},
  idleading: '{{name}}/{{version}}/{{file}}'
};

module.exports = function (options){
  options = mixarg({}, defaults, options);

  var inputStream = through.obj();
  var outputStream = through.obj();
  var streams = getStream(options);

  var jsStream = multipipe(
    parseByType(streams),
    streams.js
  );

  var cssStream = streams.css;

  inputStream
    .pipe(chooseParseType(jsStream, cssStream))
    .pipe(outputStream);

  function errorHandle(stream){
    stream.on('error', function (e){
      outputStream.emit('error', e);
    });
  }

  errorHandle(jsStream);
  errorHandle(cssStream);

  return duplexer2(inputStream, outputStream);
};

function getStream(options){
  function rename(file){
    return file;
  }

  var defaultStream = {
    '.css': plugins.css(util.extend({}, options, { css2js: false })),
    '.css.js': multipipe(
      // overide rename for this
      plugins.css(util.extend({}, options, { rename: rename, css2js: true })),
      plugins.css2js(options)
    ),
    //'.json': json(options),
    //'.tpl': tpl(options),
    //'.html': html(options),
    '.js': plugins.js(options)
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

function chooseParseType(jsStream, cssStream){
  return gulpswitch(function (file){
    var ext = extname(file.path);

    switch (ext) {
      case '.js':
        //case '.json':
        //case '.tpl':
        return '.js';
      case '.css':
        return '.css';
    }
  }, {
    '.js': jsStream,
    '.css': cssStream
  });
}

function parseByType(streams){
  return gulpswitch(function switchCondition(file){
    var ext = extname(file.path);

    return ext === '.css' ? '.css.js' : ext;
  }, streams.other);
}