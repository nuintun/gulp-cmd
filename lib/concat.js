/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var through = require('through2');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;

module.exports = function (){
  var code;
  var outputVinyl;

  return through.obj(function (vinyl, encoding, callback){
    if (vinyl.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    if (isStart(vinyl)) {
      debug('concat: %s %s', colors.dataBold(vinyl.path), colors.infoBold('start'));

      outputVinyl = vinyl;
      code = vinyl.contents.toString();

      return callback();
    }

    if (isEnd(vinyl)) {
      debug('concat: %s %s', colors.dataBold(vinyl.path), colors.infoBold('...ok'));

      outputVinyl.contents = new Buffer(code);

      this.push(outputVinyl);

      outputVinyl = null;
      code = null;

      return callback();
    }

    code += vinyl.contents.toString();

    callback();
  });
};

function isStart(vinyl){
  return vinyl.concatOpen;
}

function isEnd(vinyl){
  return vinyl.concatClose;
}