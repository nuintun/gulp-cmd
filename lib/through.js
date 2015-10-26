/**
 * Created by nuintun on 2015/9/25.
 */

'use strict';

var is = require('is');
var util = require('./util');
var Stream = require('readable-stream');
var inherits = require('util').inherits;
var Transform = Stream.Transform;

/**
 * DestroyableTransform
 * @param options
 * @constructor
 */
function DestroyableTransform(options){
  Transform.call(this, options);

  // destroyed flag
  this._destroyed = false;
}

// inherits
inherits(DestroyableTransform, Transform);

/**
 * destroy
 * @param error
 */
DestroyableTransform.prototype.destroy = function (error){
  if (this._destroyed) return;

  this._destroyed = true;

  var self = this;

  process.nextTick(function (){
    if (error) self.emit('error', error);

    self.emit('close');
  })
};

/**
 * a noop _transform function
 * @param chunk
 * @param encoding
 * @param next
 */
function noop(chunk, encoding, next){
  next(null, chunk);
}

/**
 * create a new export function, used by both the main export and
 * the .ctor export, contains common logic for dealing with arguments
 * @param construct
 * @returns {Function}
 */
function through(construct){
  return function (options, transform, flush){
    if (is.fn(options)) {
      flush = transform;
      transform = options;
      options = {};
    }

    if (!is.fn(transform)) transform = noop;
    if (!is.fn(flush)) flush = null;

    return construct(options, transform, flush);
  }
}

/**
 * exports module
 */
module.exports = through(function (options, transform, flush){
  var stream = new DestroyableTransform(util.extend({ objectMode: true, highWaterMark: 16 }, options));

  stream._transform = transform;

  if (flush) stream._flush = flush;

  return stream;
});
