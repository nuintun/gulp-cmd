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

// variable declaration
var cwd = process.cwd();
var OUTBOUNDRE = /(?:^[\\\/]?)\.\.(?:[\\\/]|$)/;
var SPLITRE = /\/((?:\d+\.){2}\d+)(?:\/|$)/;
var PATHSRE = /^([^/:]+)(\/.+)$/;
var VARSRE = /{([^{]+)}/g;

// set debug color use 6
debug.color = 6;

/**
 * parse package form vinyl
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
  var match = dir.split(SPLITRE);

  return {
    name: match[0] || '',
    version: match[1] || '',
    file: match[2] ? match[2] + '/' + filename : filename
  }
}

/**
 * simple template
 * @param format
 * @param data
 * @returns {string}
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
 * parse alias
 * @param id
 * @param alias
 * @returns {String}
 */
function parseAlias(id, alias){
  alias = alias || {};

  return alias && is.string(alias[id]) ? alias[id] : id;
}

/**
 * parse paths
 * @param id
 * @param paths
 * @returns {String}
 */
function parsePaths(id, paths){
  var match;

  paths = paths || {};

  if (paths && (match = id.match(PATHSRE)) && is.string(paths[match[1]])) {
    id = paths[match[1]] + match[2];
  }

  return id;
}

/**
 * parse vars
 * @param id
 * @param vars
 * @returns {String}
 */
function parseVars(id, vars){
  vars = vars || {};

  if (vars && id.indexOf('{') !== -1) {
    id = id.replace(VARSRE, function (match, key){
      return is.string(vars[key]) ? vars[key] : match;
    });
  }

  return id;
}

/**
 * parse map
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
 * add .js if not exists
 * @param path
 * @returns {*}
 */
function addExt(path){
  return extname(path) === '.js' ? path : (path + '.js');
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
  return /^[\\/](?:[^\\/]|$)/.test(path);
}

/**
 * test path is local path or not
 * @param path
 * @returns {boolean}
 */
function isLocal(path){
  return !/^\w*?:\/\/|^\/\//.test(path) && !/^data:\w+?\/\w+?[,;]/i.test(path);
}

/**
 * test path is out of bound of base
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
 * plugin error
 */
function throwError(){
  var slice = [].slice;
  var message = util.format
    .apply(null, slice.call(arguments));

  throw new Error(message);
}

/**
 * wrap module
 * @param id
 * @param deps
 * @param code
 * @returns {string}
 */
function wrapModule(id, deps, code){
  // header and footer template string
  var header = 'define({{id}}, {{deps}}, function(require, exports, module){';
  var footer = '});\n';

  if (Buffer.isBuffer(code)) code = code.toString();

  // debug
  debug('compile module: %s', colors.magenta(id));

  id = JSON.stringify(id);
  deps = JSON.stringify(deps);

  return template(header, { id: id, deps: deps })
    + '\n' + code + '\n' + footer;
}

/**
 * print message
 */
function print(){
  var slice = [].slice;
  var message = util.format
    .apply(null, slice.call(arguments));

  process.stdout.write(colors.cyan.bold('  gulp-cmd ') + message + '\n');
}

/**
 * define a readonly property
 * @param object
 * @param prop
 * @param value
 */
function readonlyProperty(object, prop, value){
  var setting = {
    __proto__: null,
    writable: false,
    enumerable: true,
    configurable: false
  };

  // set value
  if (arguments.length >= 3) {
    setting[value] = value;
  }

  // define property
  Object.defineProperty(object, prop, setting);
}

/**
 * exports module
 */
module.exports.cwd = cwd;
module.exports.colors = colors;
module.exports.debug = debug;
module.exports.parsePackage = parsePackage;
module.exports.template = template;
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
module.exports.extend = require('extend');
module.exports.wrapModule = wrapModule;
module.exports.print = print;
module.exports.readonlyProperty = readonlyProperty;
