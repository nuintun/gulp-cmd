/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var css = require('css');
var path = require('path');
var join = path.join;
var extname = path.extname;
var resolve = path.resolve;
var through = require('through2');
var rename = require('rename');
var udeps = require('umd-deps');
var debug = require('debug')('transport:common');
var util = require('./util');
var colors = util.colors;
var stripComments = require('strip-comments');

/**
 * Transport file id
 * - file: file object
 * - required options: idleading, rename
 */

function transportId(file, options, isjs){
  var id;
  var path;
  var pkg = util.parsePackage(file);

  // if the user specified id, use user's id
  if (file.package && file.package.id) {
    id = file.package.id;
  } else {
    var renameOpts = util.getRenameOpts(options.rename);
    var idleading = resolveIdleading(options.idleading, file.path, pkg);

    // get id
    id = util.template(idleading, pkg);
    // rename id
    id = rename.parse(isjs ? util.addExt(id) : id);
    id = rename(id, renameOpts);
    id = util.normalize(isjs ? util.hideExt(id) : id);

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (isjs && extname(id) === '.css') {
      id += '.js';
    }
  }

  // debug
  debug('transport id ( %s )', colors.dataBold(id));

  // get path
  path = util.template('{{name}}/{{version}}/{{file}}', pkg);
  // rewrite file path
  file.path = join(file.cwd, file.base, isjs ? util.addExt(path) : path);
  // set file package info
  file.package = util.extend(file.package, { id: id }, pkg);

  return id;
}

/**
 * Transport cmd dependencies.
 * - file: file object
 * - required options: idleading
 */

function transportDeps(file, options){
  var deps = [];
  var localDepsPaths = [];
  var alias = options.alias;
  var paths = options.paths;
  var vars = options.vars;

  // replace require and collect dependencies
  file.contents = new Buffer(udeps(file.contents.toString(), function (id, flag){
    // normalize id
    id = util.normalize(id);

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);

      return id;
    }

    var path;
    var isRelative = util.isRelative(id);
    var isAbsolute = util.isAbsolute(id);
    var renameOpts = util.getRenameOpts(options.rename);

    // parse id form alias, paths, vars
    id = util.parseAlias(id, alias);
    id = util.parsePaths(id, paths);
    id = util.parseAlias(id, alias);
    id = util.parseVars(id, vars);
    id = util.parseAlias(id, alias);

    // normalize id
    id = util.normalize(id);

    // if end with /, find index file
    if (id.substring(id.length - 1) === '/') {
      id += 'index';
    }

    // add extname
    path = util.addExt(id);

    // debug
    debug('transport%s dependencies ( %s )', flag ? ' ' + flag : '', colors.dataBold(id));

    // rename id
    id = rename.parse(path);
    id = (isRelative ? './' : '') + rename(id, renameOpts);

    // hide extname
    id = util.hideExt(id);

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (extname(id) === '.css') {
      id += '.js';
    }

    // normalize id
    id = util.normalize(id);

    // cache dependencie id and path
    if (flag === null) {
      // cache dependencie id
      deps.push(id);

      // get absolute path
      if (isAbsolute) {
        path = resolve(options.wwwroot, path.substring(1));
      } else {
        path = util.resolve(path, file.path);
      }

      // normalize path
      path = util.normalize(path);

      // cache dependencie absolute path
      localDepsPaths.push(path);
    }

    return id;
  }, true));

  // Cache file dependencies
  file.package = util.extend(file.package, {
    dependencies: deps,
    localDepsPaths: localDepsPaths
  });

  return deps;
}

/**
 * Transport css dependencies.
 * - file: file object
 */

function transportCssDeps(file, options, css2js){
  var deps = [];
  var localDepsPaths = [];

  file.contents = new Buffer(cssImports(file.contents.toString(), function (meta){
    var path;
    var id = meta.path;

    // normalize id
    id = util.normalize(id);

    // id is not a local file
    if (!util.isLocal(id)) {
      // cache dependencie id
      deps.push(id);

      return id;
    }

    var isRelative = util.isRelative(id);
    var isAbsolute = util.isAbsolute(id);
    var renameOpts = util.getRenameOpts(options.rename);

    if (!isAbsolute && !isRelative) {
      id = './' + id;
      isRelative = true;
    }

    // if end with /, find index file
    if (id.substring(id.length - 1) === '/') {
      id += 'index.css';
    }

    // add extname
    id = path = css2js ? util.addExt(id) : id;

    // rename path
    id = rename.parse(id);
    id = (isRelative ? './' : '') + util.normalize(rename(id, renameOpts));
    // hide extname
    id = css2js ? util.hideExt(id) : id;

    // seajs has hacked css before 3.0.0
    // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
    // demo https://github.com/popomore/seajs-test/tree/master/css-deps
    if (css2js && extname(id) === '.css') {
      id += '.js';
    }

    // get absolute path
    if (isAbsolute) {
      path = resolve(options.wwwroot, path.substring(1));
    } else {
      path = util.resolve(path, file.path);
    }

    // normalize id and path
    id = util.normalize(id);
    path = util.normalize(path);

    // debug
    debug('transport dependencies ( %s )', colors.dataBold(id));

    // cache dependencie id
    deps.push(id);
    // cache dependencie absolute path
    localDepsPaths.push(path);

    return '';
  }));

  // Cache file dependencies
  file.package = util.extend(file.package, {
    dependencies: deps,
    localDepsPaths: localDepsPaths
  });

  return deps;
}

/*
 Create a stream for parser in lib/parser
 */

function createStream(options, type, parser){
  return through.obj(function (file, enc, callback){
    if (file.isNull()) {
      debug('transport ignore filepath:%s cause null', file.path);

      return callback(null, file);
    }

    if (file.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    var ext = extname(file.path).substring(1);

    if (type && ext !== type) {
      return callback(util.throwError('extension "' + ext + '" not supported.'));
    }

    try {
      // debug
      debug('transport %s ( %s )', type, colors.dataBold(file.path));

      file = parser.call(this, file, options);
    } catch (e) {
      return callback(e);
    }

    this.push(file);

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
  return is.fn(idleading) ? idleading(filepath, util.extend({}, pkg)) : idleading;
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
 * transform css import
 * @param str
 * @param fn
 * @returns {*}
 */

function transImports(str, fn){
  cssImports(str).forEach(function (r){
    str = str.replace(r.string, fn(r));
  });

  return str;
}

/**
 * get css imports
 * @param str
 * @param fn
 * @returns {*}
 */

function cssImports(str, fn){
  if (str instanceof Buffer) str = str.toString();

  if (fn) return transImports(str, fn);

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
exports.transportCssDeps = transportCssDeps;