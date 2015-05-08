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
var isAbsolute = path.isAbsolute;
var util = require('util');
var gutil = require('gulp-util');
var debug = require('debug')('transport:util');
var colors = require('colors/safe');

// cwd
var cwd = process.cwd();
// header and footer template string
var headerTpl = 'define("{{id}}", [{{deps}}], function(require, exports, module){';
var footerTpl = '});\n';

// set colors theme
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
 * parse package form file
 * @param file
 * @returns {object}
 */
function parsePackage(file){
  var dir = normalize(dirname(file.relative));
  var filename = basename(file.relative);
  var SPLITRE = /\/((?:\d+\.){2}\d+)(?:\/|$)/;
  var match = dir.split(SPLITRE);

  return {
    name: match[0] || '',
    version: match[1] || '',
    file: match[2] ? match[2] + '/' + filename : filename
  }
}

/**
 * simple template
 * ```
 * var tpl = '{{name}}/{{version}}';
 * util.template(tpl, {name:'base', version: '1.0.0'});
 * ```
 */

function template(format, data){
  if (!is.string(format)) return '';

  return format.replace(/{{([a-z]*)}}/g, function (all, match){
    return data[match] || '';
  });
}

/**
 * set options
 * @param options
 * @returns {object}
 */

function extendOption(options){
  var defaults = {
    alias: {}, // The alias info
    paths: {}, // The paths info
    vars: {}, // The vars info
    ignore: [], // Omit the given dependencies when transport
    wwwroot: null,
    idleading: '{{name}}/{{version}}/{{file}}', // The id prefix template that can use pkg as it's data
    rename: null,
    include: 'relative'
  };

  extend(true, defaults, options);

  if (!is.string(defaults.wwwroot)) {
    throwError('options.wwwroot\'s value should be string.');
  }

  defaults.wwwroot = join(cwd, defaults.wwwroot);

  return defaults;
}

var PATHS_RE = /^([^/:]+)(\/.+)$/;
var VARS_RE = /{([^{]+)}/g;

/**
 * parse alias
 * @param id
 * @param alias
 * @returns {*}
 */

function parseAlias(id, alias){
  alias = alias || {};

  return alias && is.string(alias[id]) ? alias[id] : id;
}

/**
 * parse paths
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
 * parse vars
 * @param id
 * @param vars
 * @returns {*}
 */

function parseVars(id, vars){
  vars = vars || {};

  if (vars && id.indexOf('{') > -1) {
    id = id.replace(VARS_RE, function (m, key){
      return is.string(vars[key]) ? vars[key] : m;
    });
  }

  return id;
}

/**
 * normalize path
 * @param path
 * @returns {string}
 */

function normalize(path){
  path = path.replace(/\\+/g, '/');
  path = path.replace(/([^:/])\/+\//g, '$1/');
  path = path.replace(/^\/{2,}|(:)\/{2,}/, '//');

  return path;
}

/**
 * resolve a `relative` path base on `base` path
 * @param relative
 * @param file
 * @param wwwroot
 * @returns {string}
 */

function resolve(relative, file, wwwroot){
  var base;

  // normalize path
  relative = normalize(relative);

  // debug
  debug('resolve path: %s', colors.dataBold(relative));

  if (isRelative(relative)) {
    base = dirname(file.path);
    relative = join(base, relative);
  } else if (isAbsolute(relative)) {
    base = wwwroot;
    relative = join(base, relative.substring(1));
  } else {
    base = join(file.cwd, file.base);
    relative = join(base, relative);
  }

  // normalize path
  base = normalize(base);
  relative = normalize(relative);

  // debug
  debug('of basepath: %s', colors.dataBold(base));
  debug('to: %s', colors.dataBold(relative));

  if (isRelative(relative)) {
    throwError('%s is out of bound of %s.', relative, base);
  }

  return relative;
}

/**
 * hide .js if exists
 * @param filepath
 * @returns {*}
 */

function hideExt(filepath){
  return extname(filepath) === '.js' ? filepath.replace(/\.js$/, '') : filepath;
}

/**
 * add .js if not exists
 * @param filepath
 * @returns {*}
 */

function addExt(filepath){
  return extname(filepath) === '.js' ? filepath : (filepath + '.js');
}

/**
 * test filepath is relative path or not
 * @param filepath
 * @returns {boolean}
 */

function isRelative(filepath){
  return /^\.{1,2}\//.test(filepath);
}

/**
 * test filepath is local path or not
 * @param filepath
 * @returns {boolean}
 */

function isLocal(filepath){
  return !/^https?:\/\/|^\/\//.test(filepath) && !/^data:/.test(filepath);
}

/**
 * Plugin error
 */

function throwError(){
  var message = util.format.apply(null, [].slice.call(arguments));

  throw new gutil.PluginError('gulp-cmd', message);
}

/**
 * Get rename options
 * @param opts
 * @returns {*}
 */

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

  // handle a deep copy situation
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !is.fn(target)) {
    target = {};
  }

  for (; i < length; i++) {
    // only deal with non-null/undefined values
    options = arguments[i];

    if (options !== null) {
      if (typeof options === 'string') {
        options = options.split('');
      }

      // extend the base object
      for (name in options) {
        if (options.hasOwnProperty(name)) {
          src = target[name];
          copy = options[name];

          // prevent never-ending loop
          if (target === copy) {
            continue;
          }

          // recurse if we're merging plain objects or arrays
          if (deep && copy && (is.hash(copy) || (copy_is_array = Array.isArray(copy)))) {
            if (copy_is_array) {
              copy_is_array = false;
              clone = src && Array.isArray(src) ? src : [];
            } else {
              clone = src && is.hash(src) ? src : {};
            }

            // never move original objects, clone them
            target[name] = extend(deep, clone, copy);

            // don't bring in undefined values
          } else if (typeof copy !== 'undefined') {
            target[name] = copy;
          }
        }
      }
    }
  }

  // return the modified object
  return target;
}

/**
 * transform array to string
 * @param arr
 * @returns {string}
 */

function arr2str(arr){
  return arr.map(function (item){
    return '"' + item + '"';
  }).join(',');
}

/**
 * wrap module
 * @param id
 * @param deps
 * @param code
 * @returns {string}
 */
function wrapModule(id, deps, code){
  deps = arr2str(deps);

  if (Buffer.isBuffer(code)) code = code.toString();

  // debug
  debug('generate code for module: %s', colors.dataBold(id));

  return template(headerTpl, { id: id, deps: deps })
    + '\n' + code + '\n' + footerTpl;
}

/**
 * Exports module.
 */

exports.template = template;
exports.parsePackage = parsePackage;
exports.extendOption = extendOption;
exports.normalize = normalize;
exports.parseAlias = parseAlias;
exports.parsePaths = parsePaths;
exports.parseVars = parseVars;
exports.hideExt = hideExt;
exports.addExt = addExt;
exports.isRelative = isRelative;
exports.isAbsolute = isAbsolute;
exports.isLocal = isLocal;
exports.resolve = resolve;
exports.throwError = throwError;
exports.getRenameOpts = getRenameOpts;
exports.extend = extend;
exports.colors = colors;
exports.wrapModule = wrapModule;
