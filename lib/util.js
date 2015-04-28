/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var path = require('path');
var join = path.join;
var extname = path.extname;
var dirname = path.dirname;
var util = require('util');
var gutil = require('gulp-util');
var debug = require('debug')('Transport:util');

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
    pkg: null, // The pkg info parsed by father
    ignore: [], // Omit the given dependencies when transport
    idleading: '{{name}}/{{version}}', // The id prefix template that can use pkg as it's data
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
 * Hide .js if exists
 */

function hideExt(filepath){
  return extname(filepath) === '.js' ? filepath.replace(/\.js$/, '') : filepath;
}

/**
 * Add .js if not exists
 */

function addExt(filepath){
  return extname(filepath) ? filepath : (filepath + '.js');
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

function resolvePath(relative, base){
  if (!isRelative(relative) || !base) return relative;

  debug('transport relative id(%s) of basepath(%s)', relative, base);

  relative = join(dirname(base), relative);

  if (isRelative(relative)) {
    throwError('%s is out of bound of %s', slashPath(relative), base);
  }

  return relative;
}

function slashPath(path){
  return path.replace(/\\/g, '/');
}

function throwError(){
  var message = util.format.apply(null, [].slice.call(arguments));

  throw new gutil.PluginError('gulp-cmd', message);
}

function getRenameOpts(file, opts){
  if (typeof opts === 'function') {
    return opts;
  }

  opts = opts || {};
  var ret = { suffix: '' };

  if (opts.hash) {
    ret.suffix += '-' + file.hash;
  }

  if (opts.debug) {
    ret.suffix += '-debug';
  }

  return ret;
}

/**
 * Exports
 */

exports.template = template;
exports.extendOption = extendOption;
exports.hideExt = hideExt;
exports.addExt = addExt;
exports.isRelative = isRelative;
exports.isLocal = isLocal;
exports.resolvePath = resolvePath;
exports.slashPath = slashPath;
exports.throwError = throwError;
exports.getRenameOpts = getRenameOpts;