/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var duplexer = require('duplexer');
var util = require('./lib/util');
var cache = require('./lib/cache');
var include = require('./lib/include');
var concat = require('./lib/concat');

/**
 * main
 * @param options
 * @returns {Duplexer|*}
 */
function main(options){
  var input = include(options);
  var output = concat();
  var duplex = duplexer({ objectMode: true }, input, output);

  input.pipe(output);

  return duplex;
}

main.cache = {};
main.cache.clean = cache.clean;
main.cwd = util.cwd;
main.debug = util.debug;
main.colors = util.colors;

/**
 * exports module
 */
module.exports = main;
