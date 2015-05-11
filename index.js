/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var through = require('through2');
var duplexer = require('duplexer2');
var util = require('./lib/util');
var cache = require('./lib/cache');
var common = require('./lib/common');
var include = require('./lib/include');
var concat = require('./lib/concat');

function main(options){
  var input = through.obj({ objectMode: true });
  var output = through.obj({ objectMode: true });

  // debug
  debug('open: %s', colors.dataBold(util.cwd));

  var monitor = function (stream){
    stream.on('error', function (e){
      output.emit('error', e);
    });

    return stream;
  };

  monitor(input)
    .pipe(monitor(include(options)))
    .pipe(monitor(concat()))
    .pipe(output);

  return duplexer(input, output);
}

/**
 * Exports module.
 */

main.cache = {};
main.cache.clear = cache.clear;
main.createParser = common.createParser;
module.exports = main;