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
var through = require('through2');
var util = require('./util');
var colors = util.colors;
var transport = require('./transport');
var debug = util.debug;

// empty buffer
var NULL = new Buffer('');

function include(options){
  var initialized = false;
  var defaults = util.initOptions(options);

  // stream
  return through.obj({ objectMode: true }, function (vinyl, encoding, next){
    // return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    // throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(util.throwError('streaming not supported.'));
    }

    if (!initialized) {
      var ignore = [];
      var base = join(vinyl.cwd, vinyl.base);

      // debug
      debug('cwd: %s', colors.data(util.normalize(util.cwd)));

      // base out of bound of wwwroot
      if (util.isRelative(relative(defaults.wwwroot, base))) {
        throwError(
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

        if (util.isAbsolute(id)) {
          path = join(defaults.wwwroot, id.substring(1));
        } else if (!util.isRelative(id)) {
          path = join(vinyl.cwd, vinyl.base, id);
        }

        if (path) {
          ignore.push(util.addExt(path));
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
      // transport
      vinyl = transport(vinyl, options);

      var included = [];
      var pkg = vinyl.package;
      var startVinyl = vinyl.clone();
      var endVinyl = vinyl.clone();

      startVinyl.concatOpen = true;
      endVinyl.concatClose = true;
      endVinyl.contents = NULL;

      this.push(startVinyl);
      included.push(startVinyl.path);

      // compute include
      options.include = is.fn(options.include)
        ? options.include(pkg.id || null, vinyl.path)
        : options.include;

      includeDeps.call(this, vinyl, options, included);
      this.push(endVinyl);
    } catch (e) {
      var name = colors.verbose('  gulp-cmd ') + colors.warn(e.name.toLowerCase());
      var message = colors.error(e.message.toLowerCase());

      // show error message
      console.log('%s: %s', name, message);
    }

    next();
  });
}

/**
 * include dependencies file
 * @param vinyl
 * @param options
 * @param included
 */

function includeDeps(vinyl, options, included){
  var stream = this;
  var pkg = vinyl.package;
  var include = options.include;

  // return if include only self
  if (include === 'self') return;

  // clone options
  options = util.extend({}, options);

  // traverse
  function traverse(path, base){
    included.push(path);

    var vinyl = vinylFile(path, base);

    if (vinyl !== null) {
      vinyl = transport(vinyl, options);

      // debug
      debug('include: %s', colors.data(util.pathFromCwd(vinyl.path)));
      includeDeps.call(stream, vinyl, options, included);
      stream.push(vinyl);
    }
  }

  if (pkg && Array.isArray(pkg.include)) {
    // dependencies
    pkg.include.forEach(function (meta){
      if (meta && meta.id && meta.path) {
        // ignore or included
        if (options.ignore.indexOf(meta.path) !== -1 || included.indexOf(meta.path) !== -1) {
          return false;
        }

        switch (include) {
          case 'all':
            traverse(meta.path, vinyl);
            break;
          case 'relative':
          default :
            // include all relative file
            if (util.isRelative(meta.id)) {
              traverse(meta.path, vinyl);
            }
            break;
        }
      }
    });
  }
}

/**
 * create a new vinyl
 * @param path
 * @param vinyl
 * @returns {*}
 */

function vinylFile(path, vinyl){
  if (!is.string(path) || !vinyl) return null;

  if (!fs.existsSync(path)) {
    path = util.hideExt(path);
  }

  if (fs.existsSync(path)) {
    return new Vinyl({
      path: path,
      cwd: vinyl.cwd,
      base: vinyl.base,
      stat: fs.statSync(path),
      contents: fs.readFileSync(path)
    });
  }

  debug('file: %s not exists', colors.warn(util.pathFromCwd(path)));

  return null;
}

/**
 * Exports module.
 */

module.exports = include;
