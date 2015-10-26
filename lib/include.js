/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var is = require('is');
var fs = require('fs');
var path = require('path');
var join = path.join;
var relative = path.relative;
var Vinyl = require('vinyl');
var through = require('./through');
var util = require('./util');
var common = require('./common');
var colors = util.colors;
var transport = require('./transport');
var debug = util.debug;

// empty buffer
var NULL = new Buffer('');

/**
 * include
 * @param options
 * @returns {*}
 */
function include(options){
  var initialized = false;
  var defaults = common.initOptions(options);

  // stream
  return through({ objectMode: true }, function (vinyl, encoding, next){
    // hack old vinyl
    vinyl._isVinyl = true;
    // normalize vinyl base
    vinyl.base = relative(vinyl.cwd, vinyl.base);

    // return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(util.throwError('streaming not supported.'));
    }

    if (!initialized) {
      var ignore = {};
      var base = join(vinyl.cwd, vinyl.base);

      // debug
      debug('cwd: %s', colors.magenta(util.normalize(util.cwd)));

      // base out of bound of wwwroot
      if (util.isOutBound(base, defaults.wwwroot)) {
        util.throwError(
          'base: %s is out of bound of wwwroot: %s.',
          util.normalize(base),
          util.normalize(defaults.wwwroot)
        );
      }

      // format ignore
      defaults.ignore.forEach(function (id){
        var path;
        var alias = defaults.alias;
        var paths = defaults.paths;
        var vars = defaults.vars;

        // parse id form alias, paths, vars
        id = util.parseAlias(id, alias);
        id = util.parsePaths(id, paths);
        id = util.parseAlias(id, alias);
        id = util.parseVars(id, vars);
        id = util.parseAlias(id, alias);

        // local id add ignore
        if (util.isLocal(id)) {
          if (util.isAbsolute(id)) {
            path = join(defaults.wwwroot, id.substring(1));
          } else if (!util.isRelative(id)) {
            path = join(vinyl.cwd, vinyl.base, id);
          }

          if (path) {
            ignore[util.addExt(path)] = true;
          }
        }
      });

      // rewrite ignore
      defaults.ignore = ignore;

      initialized = true;
    }

    // catch error
    try {
      // clone options
      options = util.extend({}, defaults);

      // lock wwwroot
      Object.defineProperty(options, 'wwwroot', {
        __proto__: null,
        writable: false,
        enumerable: true,
        configurable: false
      });

      // lock plugins
      Object.defineProperty(options, 'plugins', {
        __proto__: null,
        writable: false,
        enumerable: true,
        configurable: false
      });

      // transport
      vinyl = transport(vinyl, options);

      var included = [];
      var pkg = vinyl.package;
      var start = vinyl.clone();
      var end = vinyl.clone();

      start.startConcat = true;
      start.contents = NULL;
      end.endConcat = true;

      delete start.package;

      this.push(start);
      included[start.path] = true;

      // compute include
      options.include = is.fn(options.include)
        ? options.include(pkg.id || null, vinyl.path)
        : options.include;

      includeDeps.call(this, vinyl, included, options);
      this.push(end);
    } catch (error) {
      // show error message
      util.print(colors.red.bold(error.stack) + '\x07');
    }

    next();
  });
}

/**
 * traverse
 * @param path
 * @param cwd
 * @param base
 * @param included
 * @param options
 */
function traverse(path, cwd, base, included, options){
  var stream = this;
  var vinyl = vinylFile(path, cwd, base);

  if (vinyl !== null) {
    // debug
    debug('include: %s', colors.magenta(util.pathFromCwd(vinyl.path)));

    included[path] = true;
    vinyl = transport(vinyl, options);

    includeDeps.call(stream, vinyl, included, options);
    stream.push(vinyl);
  } else {
    // debug
    debug('include: %s failed', colors.yellow(util.pathFromCwd(path)));
  }
}

/**
 * include dependencies file
 * @param vinyl
 * @param included
 * @param options
 */
function includeDeps(vinyl, included, options){
  var include = options.include;

  // return if include not equal 'all' and 'relative'
  if (include !== 'all' && include !== 'relative') return;

  var stream = this;
  var pkg = vinyl.package;

  // clone options
  options = util.extend({}, options);

  if (pkg && Array.isArray(pkg.include)) {
    // dependencies
    pkg.include.forEach(function (module){
      if (module && module.id && module.path) {
        // ignore or included
        if (options.ignore[module.path] || included[module.path]) {
          return false;
        }

        switch (include) {
          case 'all':
            traverse.call(stream, module.path, vinyl.cwd, vinyl.base, included, options);
            break;
          case 'relative':
            // include all relative file
            if (util.isRelative(module.id)) {
              traverse.call(stream, module.path, vinyl.cwd, vinyl.base, included, options);
            }

            break;
          default :
            break;
        }
      }
    });
  }
}

/**
 * create a new vinyl
 * @param path
 * @param cwd
 * @param base
 * @returns {Vinyl|null}
 */
function vinylFile(path, cwd, base){
  if (!is.string(path) || !is.string(cwd) || !is.string(base)) return null;

  var origin = path;

  if (!fs.existsSync(path)) {
    path = util.hideExt(path);
  }

  if (fs.existsSync(path)) {
    return new Vinyl({
      path: path,
      cwd: cwd,
      base: base,
      stat: fs.statSync(path),
      contents: fs.readFileSync(path)
    });
  }

  // file not exists
  util.print('file: %s not exists', colors.yellow(util.pathFromCwd(origin)));

  return null;
}

/**
 * exports module.
 */
module.exports = include;
