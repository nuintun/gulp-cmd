/**
 * Created by nuintun on 2015/4/27.
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
main.debug = util.debug;
main.colors = gutil.colors;
main.cache = { clean: gutil.cache.clean };
main.defaults = { plugins: require('./lib/plugins/index') };

/**
 * exports module
 */
module.exports = main;
