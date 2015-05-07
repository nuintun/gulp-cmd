/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var extname = require('path').extname;
var mixarg = require('mixarg');
var through = require('through2');
var duplexer2 = require('duplexer2');
var pipe = require('multipipe');
var gulpswitch = require('stream-switch');
var plugin = require('./plugins/');
var util = require('./util');

var defaults = {
  alias: {},
  cwd: process.cwd(), // For parse
  idleading: '{{name}}/{{version}}/{{file}}'
};

module.exports = function (opt){
  opt = mixarg({}, defaults, opt);

  var inputStream = through.obj();
  var outputStream = through.obj();
  var streams = getStream(opt);

  var jsStream = pipe(
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

function getStream(opt){
  function rename(file){
    return file;
  }

  var defaultStream = {
    '.css': plugin.css(opt),
    '.css.js': pipe(
      // overide rename for this
      plugin.css(util.extend({}, opt, { rename: rename, cssjs: true })),
      plugin.css2js(opt)
    ),
    //'.json': json(opt),
    //'.tpl': tpl(opt),
    //'.html': html(opt),
    '.js': plugin.js(opt)
  };

  var stream = opt.stream || {}, ret = { other: {} };

  Object.keys(defaultStream).forEach(function (key){
    var func = stream[key];

    if (func && typeof func !== 'function') {
      throw new Error('opt.stream\'s value should be function');
    }

    var val = (typeof func === 'function' && func(opt)) || defaultStream[key];

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