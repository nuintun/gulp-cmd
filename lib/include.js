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
var through = require('through');
var util = require('./util');
var common = require('./common');
var colors = util.colors;
var debug = util.debug;
var Iterator = require('./iterator');
var transport = require('./transport');

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
      util.readonlyProperty(options, 'wwwroot');
      // lock plugins
      util.readonlyProperty(options, 'plugins');

      // transport
      vinyl = transport(vinyl, options, function (vinyl, options){
        var pkg = vinyl.package;
        var start = vinyl.clone();
        var end = vinyl.clone();
        var status = { included: [], pool: {} };

        start.startConcat = true;
        start.contents = NULL;
        end.endConcat = true;

        delete start.package;

        stream.push(start);
        status.included[start.path] = true;

        // compute include
        options.include = is.fn(options.include)
          ? options.include(pkg.id || null, vinyl.path)
          : options.include;

        includeDeps.call(stream, vinyl, status, options, next);
      });
    } catch (error) {
      // show error message
      util.print(colors.red.bold(error.stack) + '\x07');
      next();
    }
  });
}

/**
 * walk file
 * @param vinyl
 * @param status
 * @param options
 * @param done
 */
function walk(vinyl, status, options, done){
  var stream = this;
  var pkg = vinyl.package;

  function push(){
    status.pool.filter(function (vinyl){
      stream.push(vinyl);

      return false;
    });

    done();
  }

  function doRead(path){
    var child = vinylFile(path, vinyl.cwd, vinyl.base);

    // read file success
    if (child !== null) {
      // debug
      debug('include: %s', colors.magenta(util.pathFromCwd(child.path)));

      // cache included
      status.included[path] = true;

      // transport file
      transport(child, options, function (child, options){
        status.pool.unshift(child);
        walk.call(stream, child, status, options, done);
      });
    } else {
      // debug
      debug('include: %s failed', colors.yellow(util.pathFromCwd(path)));
    }
  }

  if (pkg && Array.isArray(pkg.include)) {
    if (pkg.include.length) {
      var it = new Iterator(pkg.include);
      var item = it.next();

      while (!item.done) {
        var module = item.value;

        if (module && module.id && module.path) {
          // not ignore and included
          if (!options.ignore[module.path] && !status.included[module.path]) {
            if (include === 'all') {
              doRead();
            } else if (include === 'relative' && util.isRelative(module.id)) {
              doRead();
            }
          } else {
            item = it.next();
          }
        }
      }
    } else {
      push();
    }
  } else {
    push();
  }
}

/**
 * include dependencies file
 * @param vinyl
 * @param status
 * @param options
 * @param done
 */
function includeDeps(vinyl, status, options, done){
  // include
  var include = options.include;

  // return if include not equal 'all' and 'relative'
  if (include !== 'all' && include !== 'relative') {
    done();

    return;
  }

  // get package
  var pkg = vinyl.package;

  if (pkg && Array.isArray(pkg.include)) {
    if (pkg.include.length) {
      walk.call(this, vinyl, status, options, done);
    } else {
      done();
    }
  } else {
    done();
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
 * exports module
 */
module.exports = include;
