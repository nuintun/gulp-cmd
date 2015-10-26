/**
 * Created by nuintun on 2015/5/10.
 */

'use strict';

var through = require('through');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;

/**
 * concat
 * @returns {*}
 */
function concat(){
  var code = [];

  return through({ objectMode: true }, function (vinyl, encoding, next){
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

      return next();
    }

    // concat
    code.push(vinyl.contents);

    // end concat
    if (isEnd(vinyl)) {
      vinyl.contents = Buffer.concat(code);

      this.push(vinyl);
      // debug
      debug('concat: %s ok', colors.magenta(util.pathFromCwd(vinyl.path)));

      // reset code value
      code = [];
    }

    next();
  });
}

function isStart(vinyl){
  return vinyl.startConcat;
}

function isEnd(vinyl){
  return vinyl.endConcat;
}

/**
 * exports module
 */
module.exports = concat;
