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

    // when not initialized
    if (!initialized) {
      // debug
      debug('cwd: %s', colors.magenta(util.normalize(util.cwd)));

      var ignore = {};
      var base = join(vinyl.cwd, vinyl.base);

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
      // initialized
      initialized = true;
    }

    // catch error
    try {
      // stream
      var stream = this;

      // clone options
      options = util.extend({}, defaults);

      // lock wwwroot
      util.readonlyProperty(options, 'wwwroot');
      // lock plugins
      util.readonlyProperty(options, 'plugins');

      // transport
      transport(vinyl, options, function (vinyl, options){
        var pool = {};
        var pkg = vinyl.package;
        var start = vinyl.clone();
        var end = vinyl.clone();
        var pathFromCwd = util.pathFromCwd(vinyl.path);

        // set start and end file status
        start.startConcat = true;
        start.contents = NULL;
        end.endConcat = true;
        end.contents = NULL;

        // clean vinyl
        delete start.package;
        delete end.package;

        // compute include
        options.include = is.fn(options.include)
          ? options.include(pkg.id || null, vinyl.path)
          : options.include;

        // debug
        debug('concat: %s start', colors.magenta(pathFromCwd));
        stream.push(start);
        includeDeps.call(stream, vinyl, pool, options, function (){
          stream.push(end);
          // debug
          debug('concat: %s ...ok', colors.magenta(pathFromCwd));
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

  // cache path
  var origin = path;

  // file not exists
  if (!fs.existsSync(path)) {
    path = util.hideExt(path);
  }

  // file exists
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
          // cache next
          target.next = next;
          // add cache status
          pool[child.path] = {
            next: null,
            parent: target,
            included: false
          };

          // walk
          walk.call(stream, child, pool, options, done);
        });
      } else {
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

    // all file include
    if (target.parent === null) {
      done();
    } else if (target.parent.next !== null) {
      // run parent next dependencies
      target.parent.next();
    }

    // change cache status
    target.next = null;
    target.included = true;

    // clean parent
    if (target.parent !== null) {
      delete target.parent;
    }
  }

  // bootstrap
  if (target.included || !pkg) {
    doLookup();
  } else {
    async.series(pkg.include, doRead, doLookup);
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

    return done();
  }

  // set pool cache
  pool[vinyl.path] = {
    next: null,
    parent: null,
    included: false
  };

  // bootstrap
  walk.call(this, vinyl, pool, options, function (){
    // free memory
    pool = null;

    // callback
    done();
  });
}

/**
 * exports module
 */
module.exports = include;
