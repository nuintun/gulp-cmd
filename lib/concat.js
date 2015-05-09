/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var through = require('through2');
var util = require('./util');
var debug = util.debug;

module.exports = function (options){
  var vinylCache;
  var codeCache;

  return through.obj(function (vinyl, encoding, callback){
    //if (vinyl.isNull()) {
    //  // return empty file
    //  return callback(null, vinyl);
    //}

    if (vinyl.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    if (isStart(vinyl)) {
      debug('concat: %s start', vinyl.path);

      vinylCache = vinyl;
      codeCache = vinyl.contents.toString();

      return callback();
    }

    if (isEnd(vinyl)) {
      debug('concat: %s end', vinyl.path);

      vinylCache.contents = new Buffer(codeCache);

      this.push(vinylCache);

      vinylCache = null;
      codeCache = null;

      return callback();
    }

    codeCache += vinyl.contents.toString();

    callback();
  });
};

function isStart(vinyl){
  return vinyl.concatStart;
}

function isEnd(vinyl){
  return vinyl.concatEnd;
}