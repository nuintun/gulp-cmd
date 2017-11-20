/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const utils = require('./lib/utils');
const transform = require('./lib/transform');
const concat = require('./lib/concat');
const gutil = require('@nuintun/gulp-util');
const duplexer = require('@nuintun/duplexer');

/**
 * @function main
 * @param {Object} options
 * @returns {Duplexer}
 */
function main(options) {
  const input = transform(options);
  const output = concat();
  const duplex = duplexer({ objectMode: true }, input, output);

  input.pipe(output);

  return duplex;
}

main.cwd = gutil.cwd;
main.cache = utils.cache;
main.debug = utils.debug;
main.print = utils.print;
main.chalk = gutil.chalk;

// Exports module
module.exports = main;
