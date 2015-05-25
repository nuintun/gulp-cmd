/**
 * Created by Newton on 2015/5/11.
 */

'use strict';

var is = require('is');
var path = require('path');
var util = require('./util');
var debug = util.debug;
var colors = util.colors;
var dirname = path.dirname;
var basename = path.basename;
var extname = path.extname;

// Variable declaration
var defaults = { prefix: '', suffix: '' };

/**
 * rename file
 * @param path
 * @param transform
 * @returns {*}
 */

function rename(path, transform){
  var meta = parse(path);
  var basename = meta.basename + meta.extname;

  transform = is.fn(transform) ? transform(util.extend({}, meta)) : transform;

  // rename it when transformer is string as a filepath
  if (is.string(transform)) {
    path = transform.trim() || path;
  } else {
    transform = util.extend({}, defaults, transform);

    // rename
    meta.basename = transform.prefix + meta.basename + transform.suffix;

    path = format(meta);
  }

  // debug
  debug('rename: %s', colors.magenta(basename));
  debug('to: %s', colors.magenta(meta.basename + meta.extname));

  return path;
}

/**
 * parse path
 * @param path
 * @returns {{extname, dirname, basename}}
 */

function parse(path){
  var ext = extname(path);

  return {
    origin: path,
    extname: ext,
    dirname: dirname(path),
    basename: basename(path, ext)
  }
}

/**
 * format path form meta
 * @param meta
 * @returns {string}
 */

function format(meta){
  meta.dirname = meta.dirname || '.';
  meta.extname = meta.extname || '';
  meta.basename = meta.basename || '';

  return meta.dirname + '/' + meta.basename + meta.extname;
}

/**
 * Exports module.
 */

module.exports = rename;
