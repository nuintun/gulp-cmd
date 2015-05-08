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
  var js = parseByType(streams);
  var css = streams.css;

  input
    .pipe(chooseParseType(js, css, options))
    .pipe(output);

  function error(stream){
    stream.on('error', function (e){
      output.emit('error', e);
    });
  }

  error(js);
  error(css);

  return duplexer(input, output);
};

function getStream(options){
  var defaults = {
    '.js': plugins.js(options),
    '.css': plugins.css(options),
    '.tpl': plugins.tpl(options),
    '.json': plugins.json(options),
    '.html': plugins.html(options),
    '.css.js': plugins.css(options).pipe(plugins.css2js(options))
  };

  var streams = options.streams || {}, ret = { other: {} };

  Object.keys(defaults).forEach(function (key){
    var stream;

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

    if (key === '.css') {
      ret.css = stream;
    } else {
      ret.other[key] = stream;
    }
  });

  return ret;
}

function chooseParseType(js, css, options){
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
    '.js': js,
    '.css': css
  });
}

function parseByType(streams){
  return streamSwitch(function (file){
    var ext = extname(file.path);

    return ext === '.css' ? '.css.js' : ext;
  }, streams.other);
}