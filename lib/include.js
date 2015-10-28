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
var async = require('./async');
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

      var stream = this;

      // transport
      vinyl = transport(vinyl, options, function (vinyl, options){
        var pool = {};
        var pkg = vinyl.package;
        var start = vinyl.clone();
        var end = vinyl.clone();

        start.startConcat = true;
        start.contents = NULL;
        end.endConcat = true;
        end.contents = NULL;

        delete start.package;

        stream.push(start);

        // compute include
        options.include = is.fn(options.include)
          ? options.include(pkg.id || null, vinyl.path)
          : options.include;

        includeDeps.call(stream, vinyl, pool, options, function (){
          stream.push(end);
          next();
        });
      });
    } catch (error) {
      // show error message
      util.print(colors.red.bold(error.stack) + '\x07');
      next();
    }
  });
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
 * walk file
 * @param vinyl
 * @param pool
 * @param options
 * @param done
 */
function walk(vinyl, pool, options, done){
  var stream = this;
  var pkg = vinyl.package;
  var target = pool[vinyl.path];

  /**
   * read
   * @param module
   * @param next
   */
  function doRead(module, next){
    if (options.ignore[module.path]
      || pool.hasOwnProperty(module.path)
      || (options.include === 'relative' && !util.isRelative(module.id))) {
      next();
    } else {
      // create a vinyl file
      var child = vinylFile(module.path, vinyl.cwd, vinyl.base);

      // read file success
      if (child !== null) {
        // debug
        debug('include: %s', colors.magenta(util.pathFromCwd(child.path)));
        // transport file
        transport(child, options, function (child, options){
          // add cache status
          pool[child.path] = {
            next: null,
            parent: target,
            included: false
          };

          // cache next
          target.next = next;

          // walk
          walk.call(stream, child, pool, options, done);
        });
      } else {
        // debug
        debug('include: %s failed', colors.yellow(util.pathFromCwd(path)));
        next();
      }
    }
  }

  /**
   * lookup
   */
  function doLookup(){
    // push file to stream
    stream.push(vinyl);

    // change parent cache status
    target.next = null;
    target.included = true;

    // run parent next dependencies
    if (target.parent && target.parent.next !== null) {
      target.parent.next();
    }

    // all file include
    if (target.parent === null) {
      done();
    }
  }

  if (pkg && !target.included) {
    async.series(pkg.include, doRead, doLookup);
  } else {
    doLookup();
  }
}

/**
 * include dependencies file
 * @param vinyl
 * @param pool
 * @param options
 * @param done
 */
function includeDeps(vinyl, pool, options, done){
  // return if include not equal 'all' and 'relative'
  if (options.include !== 'all' && options.include !== 'relative') {
    this.push(vinyl);
    done();

    return;
  }

  pool[vinyl.path] = {
    next: null,
    parent: null,
    included: false
  };

  walk.call(this, vinyl, pool, options, done);
}

/**
 * exports module
 */
module.exports = include;
