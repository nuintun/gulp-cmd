/**
 * Created by Newton on 2015/5/9.
 */

'use strict';

var util = require('../util');
var debug = require('debug')('transport:other');

function parser(){
  return through.obj(function (file, enc, callback){
    if (file.isNull()) {
      // return empty file
      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    var ext = extname(file.path).substring(1);

    // debug
    debug('transport %s: %s', ext, colors.dataBold(util.normalize(file.path)));

    this.push(file);

    return callback();
  });
}

/**
 * exports module.
 */

module.exports = parser;