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
var relative = path.relative;
var util = require('util');
var debug = require('debug')('gulp-cmd');
var colors = require('colors/safe');

// the work cwd
var cwd = process.cwd();

// set debug color use 6
debug.color = 6;

// set colors theme
colors.setTheme({
  help: ['white'],
  data: ['grey', 'bold'],
  error: ['red', 'bold'],
  debug: ['blue', 'bold'],
  info: ['green', 'bold'],
  warn: ['yellow', 'bold'],
  verbose: ['cyan', 'bold'],
  prompt: ['white', 'bold'],
  input: ['magenta', 'bold']
});

/**
 * parse package form vinyl
 * @param vinyl
 * @param wwwroot
 * @returns {object}
 */
function parsePackage(vinyl, wwwroot){
  var relative = vinyl.relative;

  // vinyl not in base dir, user wwwroot
  if (isRelative(relative)) {
    relative = path.relative(wwwroot, vinyl.path);
    // vinyl not in wwwroot, throw error
    if (isRelative(relative)) {
      throwError('file: %s is out of bound of wwwroot: %s.', normalize(vinyl.path), normalize(wwwroot));
    }

    // reset relative
    relative = path.join('/', relative);
  }

  var dir = normalize(dirname(relative));
  var filename = basename(relative);
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

  return format.replace(/{{([a-z]*)}}/gi, function (all, match){
    return data[match] || '';
  });
}

/**
 * get rename options
 * @param transform
 * @returns {*}
 */

function initRenameOptions(transform){
  if (is.fn(transform)) {
    return transform;
  }

  transform = transform || {};

  if (transform.min) {
    transform.suffix = '-min';
  }

  if (transform.debug) {
    transform.suffix = '-debug';
  }

  return transform;
}

/**
 * set options
 * @param options
 * @returns {object}
 */

function initOptions(options){
  var defaults = {
    vars: {}, // the vars
    paths: {}, // the paths
    alias: {}, // the alias
    cache: true, // use memory file cahe
    ignore: [], // omit the given dependencies when include
    wwwroot: '', // web root
    rename: null, // { debug: boolean, min: boolean }
    prefix: null, // css prefix
    oncsspath: null, // css resource path callback
    include: 'relative', // include model: self, relative, all
    idleading: '{{name}}/{{version}}/{{file}}' // the id prefix template
  };

  extend(true, defaults, options);

  if (defaults.wwwroot && !is.string(defaults.wwwroot)) {
    throwError('options.wwwroot\'s value should be string.');
  }

  // set wwwroot
  defaults.wwwroot = join(cwd, defaults.wwwroot);
  // format ignore
  defaults.ignore = Array.isArray(defaults.ignore) ? defaults.ignore : [];
  // format oncsspath
  defaults.oncsspath = is.fn(defaults.oncsspath) ? defaults.oncsspath : null;
  // format rename
  defaults.rename = initRenameOptions(defaults.rename);

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
  var match;

  paths = paths || {};

  if (paths && (match = id.match(PATHS_RE)) && is.string(paths[match[1]])) {
    id = paths[match[1]] + match[2];
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
    id = id.replace(VARS_RE, function (match, key){
      return is.string(vars[key]) ? vars[key] : match;
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
  path = path.replace(/(:)?\/{2,}/, '$1//');

  return path;
}

/**
 * resolve a `relative` path base on `base` path
 * @param relative
 * @param vinyl
 * @param wwwroot
 * @returns {string}
 */

function resolve(relative, vinyl, wwwroot){
  var base;
  var absolute;

  // debug
  debug('resolve path: %s', colors.data(normalize(relative)));

  // resolve
  if (isRelative(relative)) {
    base = dirname(vinyl.path);
    absolute = join(base, relative);

    // out of base, use wwwroot
    if (isRelative(absolute)) {
      base = wwwroot;
      absolute = join(base, relative);

      // out of wwwroot
      if (isRelative(absolute)) {
        throwError('file: %s is out of bound of wwwroot: %s.', normalize(absolute), normalize(base));
      }
    }
  } else if (isAbsolute(relative)) {
    base = wwwroot;
    absolute = join(base, relative.substring(1));
  } else {
    base = join(vinyl.cwd, vinyl.base);
    absolute = join(base, relative);
  }

  // debug
  debug('of base path: %s', colors.data(pathFromCwd(base)));
  debug('to: %s', colors.data(pathFromCwd(absolute)));

  return absolute;
}

/**
 * hide .js if exists
 * @param path
 * @returns {*}
 */

function hideExt(path){
  return extname(path) === '.js' ? path.replace(/\.js$/, '') : path;
}

/**
 * add .js if not exists
 * @param path
 * @returns {*}
 */

function addExt(path){
  return extname(path) === '.js' ? path : (path + '.js');
}

/**
 * test path is relative path or not
 * @param path
 * @returns {boolean}
 */

function isRelative(path){
  return /^\.{1,2}[\\/]/.test(path);
}

/**
 * test path is absolute path or not
 * @param path
 * @returns {boolean}
 */

function isAbsolute(path){
  return /^[\\/](?:[^\\/]+|$)/.test(path);
}

/**
 * test path is local path or not
 * @param path
 * @returns {boolean}
 */

function isLocal(path){
  return !/^https?:\/\/|^\/\//.test(path) && !/^data:/.test(path);
}

/**
 * get relative path from cwd
 * @param path
 * @returns {string}
 */

function pathFromCwd(path){
  return normalize(relative(cwd, path));
}

/**
 * Plugin error
 */

function throwError(){
  var slice = [].slice;
  var message = util.format
    .apply(null, slice.call(arguments));

  throw new Error(message);
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
  }).join(', ');
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

  // header and footer template string
  var headerTpl = 'define("{{id}}", [{{deps}}], function(require, exports, module){';
  var footerTpl = '});\n\n';

  if (Buffer.isBuffer(code)) code = code.toString();

  // debug
  debug('compile module: %s', colors.data(id));

  return template(headerTpl, { id: id, deps: deps })
    + '\n' + code + '\n' + footerTpl;
}

/**
 * Exports module.
 */

exports.cwd = cwd;
exports.template = template;
exports.parsePackage = parsePackage;
exports.initOptions = initOptions;
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
exports.pathFromCwd = pathFromCwd;
exports.throwError = throwError;
exports.extend = extend;
exports.colors = colors;
exports.debug = debug;
exports.wrapModule = wrapModule;
