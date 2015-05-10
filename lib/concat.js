/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var through = require('through2');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;

function concat(){
  var code;
  var outputVinyl;

  return through.obj(function (vinyl, encoding, callback){
    if (vinyl.isNull()) {
      // return empty file
      return callback(null, vinyl);
    }

    if (vinyl.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    var path = util.normalize(vinyl.path);

    if (isStart(vinyl)) {
      debug('concat: %s %s', colors.dataBold(path), colors.infoBold('start'));

      outputVinyl = vinyl;
      code = vinyl.contents.toString();

      return callback();
    }

    if (isEnd(vinyl)) {
      debug('concat: %s %s', colors.dataBold(path), colors.infoBold('...ok'));

      outputVinyl.contents = new Buffer(code);

      this.push(outputVinyl);

      outputVinyl = null;
      code = null;

      return callback();
    }

    code += vinyl.contents.toString();

    callback();
  });
}

function isStart(vinyl){
  return vinyl.concatOpen;
}

function isEnd(vinyl){
  return vinyl.concatClose;
}

/**
 * Exports module.
 */

module.exports = concat();