/**
 * Created by Newton on 2015/5/10.
 */

'use strict';

var through = require('through2');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;

function concat(){
  var code = '';
  var outputVinyl;

  return through.obj({ objectMode: true }, function (vinyl, encoding, next){
    // return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(util.throwError('streaming not supported.'));
    }

    // start concat
    if (isStart(vinyl)) {
      // debug
      debug('concat: %s start', colors.magenta(util.pathFromCwd(vinyl.path)));

      outputVinyl = vinyl;

      return next();
    }

    // end concat
    if (isEnd(vinyl)) {
      // debug
      debug('concat: %s ...ok', colors.magenta(util.pathFromCwd(vinyl.path)));

      code += outputVinyl.contents.toString();
      outputVinyl.contents = new Buffer(code);

      this.push(outputVinyl);

      code = '';
      outputVinyl = null;

      return next();
    }

    code += vinyl.contents.toString();

    next();
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

module.exports = concat;
