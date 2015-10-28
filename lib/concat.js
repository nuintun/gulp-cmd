/**
 * Created by nuintun on 2015/5/10.
 */

'use strict';

var util = require('./util');
var through = require('through');

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
      return next();
    }

    // end concat
    if (isEnd(vinyl)) {
      vinyl.contents = Buffer.concat(code);

      // clean vinyl
      delete vinyl.package;

      this.push(vinyl);

      // reset code value
      code = [];

      return next();
    }

    // concat
    code.push(vinyl.contents);
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
