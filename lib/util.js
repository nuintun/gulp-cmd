/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var path = require('path');
var join = path.join;
var extname = path.extname;
var dirname = path.dirname;
var basename = path.basename;
var util = require('util');
var gutil = require('gulp-util');
var debug = require('debug')('transport:util');
var colors = require('colors/safe');

// Set colors theme
colors.setTheme({
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
  inputBold: ['grey', 'bold'],
  verboseBold: ['cyan', 'bold'],
  promptBold: ['grey', 'bold'],
  infoBold: ['green', 'bold'],
  dataBold: ['grey', 'bold'],
  helpBold: ['cyan', 'bold'],
  warnBold: ['yellow', 'bold'],
  debugBold: ['blue', 'bold'],
  errorBold: ['red', 'bold']
});

/**
 * Parse package form file
 * @param file
 * @returns {{name: (*|string), version: (*|string), file: (*|string)}}
 */
function parsePackage(file){
  var filedir = slashPath(dirname(file.relative));
  var filename = basename(file.relative);
  var SPLITRE = /\/((?:\d+\.){2}\d+)(?:\/|$)/;
  var match = filedir.split(SPLITRE);

  return {
    name: match[0] || '',
    version: match[1] || '',
    file: match[2] ? match[2] + '/' + filename : filename
  }

}

/**
 * Simple template
 * ```
 * var tpl = '{{name}}/{{version}}';
 * util.template(tpl, {name:'base', version: '1.0.0'});
 * ```
 */

function template(format, data){
  if (!format) return '';

  return format.replace(/{{([a-z]*)}}/g, function (all, match){
    return data[match] || '';
  });
}

/**
 * Set options
 */

function extendOption(options){
  var opt = {
    alias: {}, // The alias info
    paths: {}, // The paths info
    vars: {}, // The vars info
    ignore: [], // Omit the given dependencies when transport
    idleading: '{{name}}/{{version}}/{{file}}', // The id prefix template that can use pkg as it's data
    rename: null,
    include: 'relative'
  };

  if (!options) return opt;

  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      var val = options[key];

      if (val !== undefined && val !== null) {
        opt[key] = val;
      }
    }
  }

  return opt;
}

/**
 * Get realpath form id
 * for example a/b/c# should be a/b/c.
 * a/b/c?v=.0.0.1 should be a/b/c.
 * @param id
 * @returns {*}
 */
function filepath(id){
  var index;
  var last = id.length - 1;
  var charCode = id.charCodeAt(last);

  // if it ends with # or /, we should return the uri without #
  if (charCode === 35 /* "#" */ || charCode === 47 /* "/" */) return id.substring(0, last);

  // if it has with ?, we should return the uri without search params
  if ((index = id.indexOf('?')) !== -1) return id.substring(0, index);

  // ext logical
  return addExt(id);
}

var PATHS_RE = /^([^/:]+)(\/.+)$/;
var VARS_RE = /{([^{]+)}/g;

/**
 * Parse alias
 * @param id
 * @param alias
 * @returns {*}
 */

function parseAlias(id, alias){
  alias = alias || {};

  return alias && is.string(alias[id]) ? alias[id] : id;
}

/**
 * Parse paths
 * @param id
 * @param paths
 * @returns {*}
 */

function parsePaths(id, paths){
  var m;

  paths = paths || {};

  if (paths && (m = id.match(PATHS_RE)) && is.string(paths[m[1]])) {
    id = paths[m[1]] + m[2];
  }

  return id;
}

/**
 * Parse vars
 * @param id
 * @param vars
 * @returns {*}
 */

function parseVars(id, vars){
  vars = vars || {};

  if (vars && id.indexOf('{') > -1) {
    id = id.replace(VARS_RE, function (m, key){
      return isString(vars[key]) ? vars[key] : m;
    });
  }

  return id;
}

/**
 * Hide .js if exists
 */

function hideExt(filepath){
  return extname(filepath) === '.js' ? filepath.replace(/\.js$/, '') : filepath;
}

/**
 * Add .js if not exists
 */

function addExt(filepath){
  return extname(filepath) === '.js' ? filepath : (filepath + '.js');
}

/**
 * Test filepath is relative path or not
 */

function isRelative(filepath){
  return /^\.{1,2}[\\/]/.test(filepath);
}

/**
 * Test filepath is local path or not
 */

function isLocal(filepath){
  return !/^https?:\/\//.test(filepath) && !/^data:/.test(filepath);
}

/**
 * Resolve a `relative` path base on `base` path
 */

function resolve(relative, base){
  if (!isRelative(relative) || !base) return relative;

  debug('transport relative path ( %s ) of basepath ( %s )', colors.dataBold(relative), colors.dataBold(base));

  relative = join(dirname(base), relative);

  if (isRelative(relative)) {
    throwError('%s is out of bound of %s', slashPath(relative), base);
  }

  return relative;
}

function slashPath(path){
  return path.replace(/([^:/])\/+\/|\\+/g, '/');
}

function throwError(){
  var message = util.format.apply(null, [].slice.call(arguments));

  throw new gutil.PluginError('gulp-cmd', message);
}

function getRenameOpts(opts){
  if (typeof opts === 'function') {
    return opts;
  }

  var ret = {};

  opts = opts || {};

  if (opts.min) {
    ret.suffix = '-min';
  }

  if (opts.debug) {
    ret.suffix = '-debug';
  }

  return ret;
}

/**
 * node.extend
 * Copyright 2011, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * @fileoverview
 * Port of jQuery.extend that actually works on node.js
 */

function extend(){
  var target = arguments[0] || {};
  var i = 1;
  var length = arguments.length;
  var deep = false;
  var options, name, src, copy, copy_is_array, clone;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !is.fn(target)) {
    target = {};
  }

  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    options = arguments[i];

    if (options != null) {
      if (typeof options === 'string') {
        options = options.split('');
      }

      // Extend the base object
      for (name in options) {
        if (options.hasOwnProperty(name)) {
          src = target[name];
          copy = options[name];

          // Prevent never-ending loop
          if (target === copy) {
            continue;
          }

          // Recurse if we're merging plain objects or arrays
          if (deep && copy && (is.hash(copy) || (copy_is_array = is.array(copy)))) {
            if (copy_is_array) {
              copy_is_array = false;
              clone = src && is.array(src) ? src : [];
            } else {
              clone = src && is.hash(src) ? src : {};
            }

            // Never move original objects, clone them
            target[name] = extend(deep, clone, copy);

            // Don't bring in undefined values
          } else if (typeof copy !== 'undefined') {
            target[name] = copy;
          }
        }
      }
    }
  }

  // Return the modified object
  return target;
}

/**
 * Exports module.
 */

exports.template = template;
exports.parsePackage = parsePackage;
exports.extendOption = extendOption;
exports.filepath = filepath;
exports.parseAlias = parseAlias;
exports.parsePaths = parsePaths;
exports.parseVars = parseVars;
exports.hideExt = hideExt;
exports.addExt = addExt;
exports.isRelative = isRelative;
exports.isLocal = isLocal;
exports.resolve = resolve;
exports.slashPath = slashPath;
exports.throwError = throwError;
exports.getRenameOpts = getRenameOpts;
exports.extend = extend;
exports.colors = colors;