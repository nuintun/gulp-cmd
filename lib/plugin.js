/**
 * Created by Newton on 2015/10/26.
 */

'use strict';

var is = require('is');
var util = require('./util');
var Vinyl = require('vinyl');

/**
 * Plugin
 * @param name
 * @param transport
 * @constructor
 */
function Plugin(name, transport) {
  this.name = name;
  this.vinyl = null;

  // transport must be a function
  if (is.fn(transport)) {
    this.transport = transport;
  } else {
    util.throwError('plugin %s: transport must be a function.', this.name);
  }
}

/**
 * prototype
 * @type {{push: Function, exec: Function}}
 */
Plugin.prototype = {
  /**
   * push
   * @param vinyl
   */
  push: function(vinyl) {
    if (Vinyl.isVinyl(this.vinyl)) {
      vinyl.package = vinyl.package || {};
      this.vinyl = vinyl;
    } else {
      util.throwError('plugin %s: transport function must be return a vinyl.', this.name);
    }
  },
  /**
   * exec
   * @param vinyl
   * @param options
   * @param done
   */
  exec: function(vinyl, options, done) {
    // set vinyl
    this.vinyl = vinyl;

    // run transport
    this.transport(vinyl, options, next(done, options).bind(this));
  }
};

/**
 * next
 * @param done
 * @param options
 * @returns {Function}
 */
function next(done, options) {
  return function() {
    done(this.vinyl, options);
  };
}

/**
 * exports module
 */
module.exports = Plugin;
