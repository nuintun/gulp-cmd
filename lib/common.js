/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var css = require('css');
var path = require('path');
var join = path.join;
var extname = path.extname;
var through = require('through2');
var rename = require('rename');
var udeps = require('umd-deps');
var debug = require('debug')('transport:common');
var util = require('./util');
var colors = util.colors;
var stripComments = require('strip-comments');

/**
 * Transport cmd id
 * - file: file object of father
 * - required options: idleading, rename
 */

function transportId(file, options){
  var pkg = util.parsePackage(file);
  var idleading = resolveIdleading(options.idleading, file.path, pkg);
  var id = util.template(idleading, pkg);
  var renameOpts = util.getRenameOpts(options.rename);

  // rename id
  id = rename.parse(util.addExt(id));
  id = rename(id, renameOpts);
  id = util.slashPath(util.hideExt(id));

  // seajs has hacked css before 3.0.0
  // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
  // demo https://github.com/popomore/seajs-test/tree/master/css-deps
  if (extname(id) === '.css') {
    id += '.js';
  }

  // debug
  debug('transport id ( %s )', colors.dataBold(id));

  // rewrite relative
  file.path = join(file.base, util.addExt(id));
  // set file package info
  file.package = util.extend(file.package, { id: id }, pkg);

  return id;
}

/**
 * Transport cmd dependencies, it will get deep dependencies of the file,
 * but will ignore relative module of the dependent package.
 * - file: file object of father
 * - required options: idleading, rename, ignore
 */

function transportDeps(file, options){
  var deps = [];
  var depspath = [];
  var alias = options.alias;
  var paths = options.paths;
  var vars = options.vars;

  // replace require and collect dependencies
  file.contents = new Buffer(udeps(file.contents.toString(), function (id, flag){
    var path;
    var query;
    var normalizeId;
    var last = id.length - 1;
    var charCode = id.charCodeAt(last);
    var renameOpts = util.getRenameOpts(options.rename);
    var isRelative = util.isRelative(id);

    // parse id form alias, paths, vars
    id = util.parseAlias(id, alias);
    id = util.parsePaths(id, paths);
    id = util.parseAlias(id, alias);
    id = util.parseVars(id, vars);
    id = util.parseAlias(id, alias);

    // if the id ends with `#`, just return it without '#'
    if (charCode === 35 /* "#" */) {
      normalizeId = id.substring(0, last);
    } else
    // if the id not ends with `/' '.js' or not has '?', just return it with '.js'
    if (id.substring(last - 2) !== '.js' && id.indexOf('?') === -1 /* "?" */ && charCode !== 47 /* "/" */) {
      normalizeId = id + '.js';
    }

    // parse id form alias
    if (alias && is.string(alias[normalizeId])) {
      id = util.parseAlias(normalizeId, alias);
    }

    // debug
    debug('transport%s dependencies ( %s )', flag ? ' ' + flag : '', colors.dataBold(id));

    // get file path form id
    path = util.normalize(id);
    // get search string
    query = id.substr(path.length);
    // add extname
    path = util.addExt(path);
    // rename id
    id = rename.parse(path);
    id = (isRelative ? './' : '') + util.slashPath(rename(id, renameOpts));

    // if id do not ends with `#` '/' or has '?', hide extname
    if (!query.length) {

      id = util.hideExt(id);
      // seajs has hacked css before 3.0.0
      // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
      // demo https://github.com/popomore/seajs-test/tree/master/css-deps
      if (extname(id) === '.css') {
        id += '.js';
      }
    }

    // add query string
    id = id + query;

    // cache dependencie id and path
    if (flag === null) {
      // cache dependencie id
      deps.push(id);

      // get absolute path
      path = util.slashPath(join(file.base, util.resolve(path, file.package.id)));

      // cache dependencie absolute path
      depspath.push(path);
    }

    return id;
  }, true));

  // Cache file dependencies
  file.package = util.extend(file.package, { dependencies: deps, dependenciespath: depspath });

  return deps;
}

/*
 Create a stream for parser in lib/parser
 */

function createStream(options, type, parser){
  options = util.extendOption(options);

  return through.obj(function (gfile, enc, callback){
    if (gfile.isNull()) {
      debug('transport ignore filepath:%s cause null', gfile.path);

      return callback(null, gfile);
    }

    if (gfile.isStream()) {
      return callback(new Error('Streaming not supported.'));
    }

    var ext = extname(gfile.path).substring(1);

    if (type && ext !== type) {
      return callback(new Error('extension "' + ext + '" not supported.'));
    }

    try {
      // debug
      debug('transport %s / filepath:%s', type, gfile.path);

      gfile = parser.call(this, gfile, options);
    } catch (e) {
      return callback(e);
    }

    this.push(gfile);

    return callback();
  });
}

/**
 * resolve id leading
 * @param idleading
 * @param filepath
 * @param pkg
 * @returns {*}
 */
function resolveIdleading(idleading, filepath, pkg){
  return is.fn(idleading) ? idleading(filepath, pkg) : idleading;
}

/**
 * get css resource uri
 * @param str
 * @param fn
 * @returns {*}
 */

function cssPaths(str, fn){
  if (str instanceof Buffer) str = str.toString();

  var ast = css.parse(str);
  var rules = ast.stylesheet.rules;
  var CSSPATHRE = /url\(["\']?(.*?)["\']?\)/gi;

  function traverse(rules){
    var meta;
    var ret = [];

    rules.forEach(function (rule){
      if (rule.rules) {
        ret = ret.concat(traverse(rule.rules));
      } else {
        if (!rule.declarations) {
          return [];
        }

        rule.declarations.forEach(function (d){
          var m;
          var found = [];

          while (m = CSSPATHRE.exec(d.value)) {
            meta = {
              property: d.property,
              string: m[0],
              path: m[1]
            };

            // debug
            debug('css resource ( %s: %s )', colors.dataBold(meta.property), colors.dataBold(meta.path));
            
            found.push(meta);
          }

          if (fn) {
            found.forEach(function (f){
              d.value = d.value.replace(f.string, fn(f));
            });
          }

          ret = ret.concat(found);
        });
      }
    });

    return ret;
  }

  var ret = traverse(rules);

  if (fn) {
    if (ret.length) {
      return css.stringify(ast);
    } else {
      return str;
    }
  } else {
    return ret;
  }
}

/**
 * get css imports
 * @param str
 * @param fn
 * @returns {*}
 */

function cssImports(str, fn){
  if (str instanceof Buffer) str = str.toString();

  if (fn) return function (str, fn){
    cssImports(str).forEach(function (r){
      str = str.replace(r.string, fn(r));
    });

    return str;
  };

  var m;
  var meta;
  var ret = [];
  var re = /@import *(?:url\(['"]?([^'")]+)['"]?\)|['"]([^'"]+)['"]);?/g;

  str = stripComments.block(str);

  while (m = re.exec(str)) {
    meta = {
      string: m[0],
      path: m[1] || m[2],
      index: m.index
    };

    // debug
    debug('css import ( %s )', colors.dataBold(meta.path));

    ret.push(meta);
  }

  return ret;
}

/**
 * Exports module.
 */

exports.transportId = transportId;
exports.transportDeps = transportDeps;
exports.createStream = createStream;
exports.resolveIdleading = resolveIdleading;
exports.cssPaths = cssPaths;
exports.cssImports = cssImports;