/**
 * Created by Newton on 2015/5/11.
 */

'use strict';

var is = require('is');
var path = require('path');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;
var parse = path.parse;
var format = path.format;

var defaults = {
  prefix: '',
  suffix: ''
};

/**
 * rename file
 * @param path
 * @param transform
 * @returns {*}
 */

function rename(path, transform){
  var origin = path;
  var meta = parse(path);

  transform = is.fn(transform) ? transform(util.extend({}, meta)) : transform;

  // rename it when transformer is string as a filepath
  if (is.string(transform)) {
    path = transform.trim() || path;
  } else {
    transform = util.extend({}, defaults, transform);

    meta.name = transform.prefix + meta.name + transform.suffix;
    meta.base = meta.name + meta.ext;

    path = format(meta);
  }

  // debug
  debug('rename: %s', colors.magenta(util.normalize(origin)));
  debug('to: %s', colors.magenta(util.normalize(path)));

  return path;
}

/**
 * Exports module.
 */

module.exports = rename;