/**
 * Created by nuintun on 2015/9/25.
 */

'use strict';

var is = require('is');
var Stream = require('readable-stream');
var Duplex = Stream.Duplex;
var Readable = Stream.Readable;

/**
 * Duplexer
 * @type {Function}
 */
function Duplexer(options, writable, readable){
  var self = this;

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
    if (!is.bool(options.bubbleErrors)) {
      throw new TypeError(
        String(options.bubbleErrors) +
        ' is not a Boolean value. `bubbleErrors` option of duplexer must be Boolean (`true` by default).'
      );
    }

    this._bubbleErrors = options.bubbleErrors;
  }

  if (!is.fn(readable.read)) {
    readable = (new Readable()).wrap(readable);
  }

  this._writable = writable;
  this._readable = readable;
  this._ondrain = null;
  this._drained = true;
  this._forwarding = false;

  this.once('finish', function (){
    writable.end();
  });

  writable.on('drain', function (){
    var ondrain = self._ondrain;

    self._ondrain = null;

    if (ondrain) ondrain();
  });

  writable.once('finish', function (){
    self.end();
  });

  readable.on('readable', function (){
    self._forward();
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
}

// extend
Duplexer.prototype = Object.create(Duplex.prototype, { constructor: { value: Duplexer } });

/**
 * _read
 * @private
 */
Duplexer.prototype._read = function (){
  this._drained = true;

  this._forward();
};

/**
 * _write
 * @param chunk
 * @param encoding
 * @param next
 * @private
 */
Duplexer.prototype._write = function (chunk, encoding, next){
  if (!this._writable.write(chunk)) {
    this._ondrain = next;
  } else {
    next();
  }
};

/**
 * _forward
 * @private
 */
Duplexer.prototype._forward = function (){
  if (this._forwarding || !this._drained) return;

  this._forwarding = true;

  var data = this._readable.read();

  while (data !== null) {
    this._drained = this.push(data);

    if (this._drained) {
      data = this._readable.read();
    } else {
      break;
    }
  }

  this._forwarding = false;
};

/**
 * exports module.
 */
module.exports = function (options, writable, readable){
  return new Duplexer(options, writable, readable);
};
module.exports.Duplexer = Duplexer;