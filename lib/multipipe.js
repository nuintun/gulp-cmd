/**
 * Created by Newton on 2015/5/7.
 */

'use strict';

var Stream = require('stream');
var duplexer = require('duplexer2');

/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Duplexer options.
 */

var opts = {
  bubbleErrors: false
};

/**
 * Expose `pipe`.
 */

module.exports = pipe;

/**
 * Pipe
 * @params {Stream,...,[Function]}
 * @return {Stream}
 * @api public
 */

function pipe(){
  if (arguments.length == 1) return arguments[0];

  var cb;
  var streams = slice.call(arguments);

  if ('function' == typeof streams[streams.length - 1]) {
    cb = streams.splice(-1)[0];
  }

  var ret;
  var first = streams[0];
  var last = streams[streams.length - 1];

  if (first.writable && last.readable) ret = duplexer(opts, first, last);
  else if (first.writable) ret = first;
  else if (last.readable) ret = last;
  else ret = new Stream();

  streams.forEach(function (stream, i){
    var next = streams[i + 1];

    if (next) stream.pipe(next);
    if (stream != ret) stream.on('error', ret.emit.bind(ret, 'error'));
  });

  if (cb) {
    var ended = false;
    var end = function (err){
      if (ended) return;

      ended = true;

      cb(err);
    };

    ret.on('error', end);
    last.on('finish', end);
  }

  return ret;
}