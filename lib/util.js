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
var colors = require('colors/safe');
var debug = require('debug')('gulp-cmd');

// Variable declaration
var cwd = process.cwd();
var OUTBOUNDRE = /(?:^[\\\/]?)\.\.(?:[\\\/]|$)/;
var PATHS_RE = /^([^/:]+)(\/.+)$/;
var VARS_RE = /{([^{]+)}/g;

// Set debug color use 6
debug.color = 6;

/**
 * Parse package form vinyl
 * @param vinyl
 * @param wwwroot
 * @returns {object}
 */

function parsePackage(vinyl, wwwroot){
  var relative = vinyl.relative;

  // vinyl not in base dir, user wwwroot
  if (OUTBOUNDRE.test(relative)) {
    relative = path.relative(wwwroot, vinyl.path);
    // vinyl not in wwwroot, throw error
    if (OUTBOUNDRE.test(relative)) {
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
 * Simple template
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
 * Create a plugin
 * @param name
 * @param transport
 * @returns {Function}
 */

function plugin(name, transport){
  return function (vinyl, options){
    // debug
    debug('load plugin: %s', colors.green(name));
    // debug
    debug('read file: %s', colors.magenta(pathFromCwd(vinyl.path)));

    vinyl = transport(vinyl, options);

    // normalize package
    if (!vinyl.package) {
      vinyl.package = {};
    }

    return vinyl;
  };
}

/**
 * Parse alias
 * @param id
 * @param alias
 * @returns {String}
 */

function parseAlias(id, alias){
  alias = alias || {};

  return alias && is.string(alias[id]) ? alias[id] : id;
}

/**
 * Parse paths
 * @param id
 * @param paths
 * @returns {String}
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
 * Parse vars
 * @param id
 * @param vars
 * @returns {String}
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
 * Parse map
 * @param id
 * @param map
 * @returns {String}
 */

function parseMap(id, map){
  var ret = id;

  if (Array.isArray(map)) {
    for (var i = 0, len = map.length; i < len; i++) {
      var rule = map[i];

      // parse map
      if (is.fn(rule)) {
        ret = rule(id);
      } else if (Array.isArray(rule)) {
        ret = id.replace(rule[0], rule[1]);
      }

      // must be string
      if (!ret || !is.string(ret)) {
        ret = id;
      }

      // only apply the first matched rule
      if (ret !== id) break;
    }
  }

  return ret;
}

/**
 * Normalize path
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
 * Resolve a `relative` path base on `base` path
 * @param relative
 * @param vinyl
 * @param wwwroot
 * @returns {string}
 */

function resolve(relative, vinyl, wwwroot){
  var base;
  var absolute;

  // debug
  debug('resolve path: %s', colors.magenta(normalize(relative)));

  // resolve
  if (isRelative(relative)) {
    base = dirname(vinyl.path);
    absolute = join(base, relative);

    // out of base, use wwwroot
    if (isOutBound(absolute, wwwroot)) {
      throwError('file: %s is out of bound of wwwroot: %s.', normalize(absolute), normalize(wwwroot));
    }
  } else if (isAbsolute(relative)) {
    base = wwwroot;
    absolute = join(base, relative.substring(1));
  } else {
    base = join(vinyl.cwd, vinyl.base);
    absolute = join(base, relative);
  }

  // debug
  debug('of base path: %s', colors.magenta(pathFromCwd(base)));
  debug('to: %s', colors.magenta(pathFromCwd(absolute)));

  return absolute;
}

/**
 * Add .js if not exists
 * @param path
 * @returns {*}
 */

function addExt(path){
  return extname(path) === '.js' ? path : (path + '.js');
}

/**
 * Hide .js if exists
 * @param path
 * @returns {*}
 */

function hideExt(path){
  return extname(path) === '.js' ? path.replace(/\.js$/, '') : path;
}

/**
 * Test path is relative path or not
 * @param path
 * @returns {boolean}
 */

function isRelative(path){
  return /^\.{1,2}[\\/]/.test(path);
}

/**
 * Test path is absolute path or not
 * @param path
 * @returns {boolean}
 */

function isAbsolute(path){
  return /^[\\/](?:[^\\/]|$)/.test(path);
}

/**
 * Test path is local path or not
 * @param path
 * @returns {boolean}
 */

function isLocal(path){
  return !/^https?:\/\/|^\/\//.test(path) && !/^data:/.test(path);
}

/**
 * Test path is out of bound of base
 * @param path
 * @param base
 * @returns {boolean}
 */

function isOutBound(path, base){
  return OUTBOUNDRE.test(relative(base, path));
}

/**
 * Get relative path from cwd
 * @param path
 * @returns {string}
 */

function pathFromCwd(path){
  return normalize(relative(cwd, path)) || './';
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
 * Node extend
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
 * Wrap module
 * @param id
 * @param deps
 * @param code
 * @returns {string}
 */

function wrapModule(id, deps, code){
  // header and footer template string
  var headerTpl = 'define({{id}}, {{deps}}, function(require, exports, module){';
  var footerTpl = '});\n\n';

  if (Buffer.isBuffer(code)) code = code.toString();

  // debug
  debug('compile module: %s', colors.magenta(id));

  id = JSON.stringify(id);
  deps = JSON.stringify(deps);

  return template(headerTpl, { id: id, deps: deps })
    + '\n' + code + '\n' + footerTpl;
}

/**
 * Print message
 */

function print(){
  var slice = [].slice;
  var message = util.format
    .apply(null, slice.call(arguments));

  process.stdout.write(colors.cyan.bold('  gulp-cmd ') + message + '\n');
}

/**
 * Exports module.
 */

module.exports.cwd = cwd;
module.exports.colors = colors;
module.exports.debug = debug;
module.exports.parsePackage = parsePackage;
module.exports.template = template;
module.exports.plugin = plugin;
module.exports.parseAlias = parseAlias;
module.exports.parsePaths = parsePaths;
module.exports.parseVars = parseVars;
module.exports.parseMap = parseMap;
module.exports.normalize = normalize;
module.exports.resolve = resolve;
module.exports.addExt = addExt;
module.exports.hideExt = hideExt;
module.exports.isRelative = isRelative;
module.exports.isAbsolute = isAbsolute;
module.exports.isLocal = isLocal;
module.exports.isOutBound = isOutBound;
module.exports.pathFromCwd = pathFromCwd;
module.exports.throwError = throwError;
module.exports.extend = extend;
module.exports.wrapModule = wrapModule;
module.exports.print = print;
