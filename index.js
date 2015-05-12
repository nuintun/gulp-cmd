/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var through = require('through2');
var duplexer = require('duplexer2');
var util = require('./lib/util');
var rename = require('./lib/rename');
var cache = require('./lib/cache');
var common = require('./lib/common');
var include = require('./lib/include');
var concat = require('./lib/concat');

function main(options){
  var input = through.obj({ objectMode: true });
  var output = through.obj({ objectMode: true });

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
main.cache.clean = cache.clean;
main.createParser = common.createParser;
main.cwd = util.cwd;
main.debug = util.debug;
main.colors = util.colors;
main.parseVars = util.parseVars;
main.parsePaths = util.parsePaths;
main.parseAlias = util.parseAlias;
main.throwError = util.throwError;
main.addExt = util.addExt;
main.hideExt = util.hideExt;
main.isLocal = util.isLocal;
main.isAbsolute = util.isAbsolute;
main.isRelative = util.isRelative;
main.rename = rename;
main.extend = util.extend;
main.normalize = util.normalize;
main.pathFormCwd = util.pathFormCwd;
module.exports = main;
