/**
 * Created by nuintun on 2015/9/25.
 */

"use strict";

var stream = require('readable-stream');
var Duplex = stream.Duplex;
var Readable = stream.Readable;

module.exports = function (options, writable, readable){
  return new DuplexWrapper(options, writable, readable);
};

var DuplexWrapper = exports.DuplexWrapper = function DuplexWrapper(options, writable, readable){
  if (readable === undefined) {
    readable = writable;
    writable = options;
    options = {};
  } else {
    options = options || {};
  }

  Duplex.call(this, options);

  if (options.bubbleErrors === undefined) {
    this._bubbleErrors = true;
  } else {
    if (typeof options.bubbleErrors !== 'boolean') {
      throw new TypeError(
        String(options.bubbleErrors) +
        ' is not a Boolean value. `bubbleErrors` option of duplexer2 must be Boolean (`true` by default).'
      );
    }

    this._bubbleErrors = options.bubbleErrors;
  }

  if (typeof readable.read !== 'function') {
    readable = (new Readable()).wrap(readable);
  }

  this._writable = writable;
  this._readable = readable;

  var self = this;

  writable.once('finish', function (){
    self.end();
  });

  this.once('finish', function (){
    writable.end();
  });

  readable.on('data', function (chunk){
    if (!self.push(chunk)) {
      readable.pause();
    }
  });

  readable.once('end', function (){
    return self.push(null);
  });

  if (this._bubbleErrors) {
    writable.on('error', function (error){
      return self.emit('error', error);
    });

    readable.on('error', function (error){
      return self.emit('error', error);
    });
  }
};

DuplexWrapper.prototype = Object.create(stream.Duplex.prototype, { constructor: { value: DuplexWrapper } });

DuplexWrapper.prototype._read = function _read(){
  this._readable.resume();
};

DuplexWrapper.prototype._write = function _write(input, encoding, done){
  this._writable.write(input, encoding, done);
};
