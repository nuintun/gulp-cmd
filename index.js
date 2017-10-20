/*!
 * index
 *
 * Date: 2017/07/11
 * https://github.com/nuintun/gulp-cmd
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-cmd/blob/master/LICENSE
 */

'use strict';

var util = require('./lib/util');
var transform = require('./lib/transform');
var concat = require('./lib/concat');
var gutil = require('@nuintun/gulp-util');
var duplexer = require('@nuintun/duplexer');

/**
 * main
 * @param options
 * @returns {Duplexer}
 */
function main(options) {
  var input = transform(options);
  var output = concat();
  var duplex = duplexer({ objectMode: true }, input, output);

  input.pipe(output);

  return duplex;
}

main.cwd = gutil.cwd;
main.cache = util.cache;
main.debug = util.debug;
main.print = util.print;
main.chalk = gutil.chalk;

/**
 * exports module
 */
module.exports = main;
