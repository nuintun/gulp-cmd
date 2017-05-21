/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var Vinyl = require('vinyl');
var util = require('./util');
var through = require('@nuintun/through');
var gutil = require('@nuintun/gulp-util');

var join = path.join;
var relative = path.relative;

/**
 * include
 *
 * @param options
 * @returns {Stream}
 */
module.exports = function(options) {
  var initialized = false;
  var configure = util.initOptions(options);

  // stream
  return through({ objectMode: true }, function(vinyl, encoding, next) {
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
      return next(gutil.throwError('streaming not supported.'));
    }

    // when not initialized
    if (!initialized) {
      // debug
      util.debug('cwd: %s', gutil.colors.magenta(gutil.normalize(gutil.cwd)));

      var ignore = {};
      var base = join(vinyl.cwd, vinyl.base);

      // base out of bound of wwwroot
      if (gutil.isOutBound(base, configure.wwwroot)) {
        gutil.throwError(
          'base: %s is out of bound of wwwroot: %s.',
          gutil.normalize(base),
          gutil.normalize(configure.wwwroot)
        );
      }

      // format ignore
      configure.ignore.forEach(function(id) {
        var path;
        var alias = configure.alias;
        var paths = configure.paths;
        var vars = configure.vars;

        // parse id form alias, paths, vars
        id = util.parseAlias(id, alias);
        id = util.parsePaths(id, paths);
        id = util.parseAlias(id, alias);
        id = util.parseVars(id, vars);
        id = util.parseAlias(id, alias);

        // local id add ignore
        if (gutil.isLocal(id)) {
          if (gutil.isAbsolute(id)) {
            path = join(configure.wwwroot, id.substring(1));
          } else if (!gutil.isRelative(id)) {
            path = join(vinyl.cwd, vinyl.base, id);
          }

          if (path) {
            ignore[util.addExt(path)] = true;
          }
        }
      });

      // rewrite ignore
      configure.ignore = ignore;
      // initialized
      initialized = true;
    }

    // catch error
    try {
      // stream
      var stream = this;

      // clone options
      options = gutil.extend({}, configure);

      // lock wwwroot
      gutil.readonlyProperty(options, 'wwwroot');
      // lock plugins
      gutil.readonlyProperty(options, 'plugins');

      // transport
      util.transport(vinyl, options, function(vinyl, options) {
        var pool = {};
        var pkg = vinyl.package;
        var start = vinyl.clone();
        var end = vinyl.clone();
        var pathFromCwd = gutil.pathFromCwd(vinyl.path);

        // set start and end file status
        start.contents = gutil.BLANK;
        start.concat = gutil.CONCAT_STATUS.START;
        end.contents = gutil.BLANK;
        end.concat = gutil.CONCAT_STATUS.END;

        // clean vinyl
        delete start.package;
        delete end.package;

        // compute include
        options.include = gutil.isFunction(options.include)
          ? options.include(pkg.id || null, vinyl.path)
          : options.include;

        // debug
        util.debug('concat: %s start', gutil.colors.magenta(pathFromCwd));
        // push start blank vinyl
        stream.push(start);
        // include dependencies files
        includeDeps.call(stream, vinyl, pool, options, function() {
          // push end blank vinyl
          stream.push(end);

          // free memory
          pool = null;

          // debug
          util.debug('concat: %s ...ok', gutil.colors.magenta(pathFromCwd));
          next();
        });
      });
    } catch (error) {
      // show error message
      util.print(gutil.colors.red.bold(error.stack) + '\x07');
      next();
    }
  });
}

/**
 * create a new vinyl
 *
 * @param path
 * @param cwd
 * @param base
 * @param done
 * @returns {void}
 */
function vinylFile(path, cwd, base, done) {
  if (!gutil.isString(path)
    || !gutil.isString(cwd)
    || !gutil.isString(base)) {
    return done(null);
  }

  // cache path
  var src = path;

  // print error
  function printError(error) {
    util.print(
      'file: %s is %s',
      gutil.colors.yellow(gutil.pathFromCwd(src)),
      error.code
    );
  }

  // read file
  function readFile(path, stat) {
    fs.readFile(path, function(error, data) {
      if (error) {
        done(null);

        return printError(error);
      }

      done(new gutil.Vinyl({
        path: path,
        cwd: cwd,
        base: base,
        stat: stat,
        contents: data
      }));
    });
  }

  // read file use origin path
  fs.stat(path, function(error, stat) {
    if (error) {
      path = util.hideExt(path);

      // read file use hide extname path
      fs.stat(path, function(error, stat) {
        if (error) {
          done(null);

          return printError(error);
        }

        readFile(path, stat);
      });
    } else {
      readFile(path, stat);
    }
  });
}

/**
 * walk file
 *
 * @param vinyl
 * @param pool
 * @param options
 * @param done
 * @returns {void}
 */
function walk(vinyl, pool, options, done) {
  var stream = this;
  var pkg = vinyl.package;
  var status = pool[vinyl.path];

  /**
   * transport dependence file
   * @param module
   * @param next
   */
  function transform(module, next) {
    if (options.ignore[module.path]
      || pool.hasOwnProperty(module.path)
      || (options.include === 'relative' && !gutil.isRelative(module.id))) {
      next();
    } else {
      // create a vinyl file
      vinylFile(module.path, vinyl.cwd, vinyl.base, function(child) {
        // read file success
        if (child !== null) {
          // debug
          util.debug('include: %s', gutil.colors.magenta(gutil.pathFromCwd(child.path)));
          // transport file
          util.transport(child, options, function(child, options) {
            // cache next
            status.next = next;
            // add cache status
            pool[child.path] = {
              next: null,
              parent: status,
              included: false
            };

            // walk
            walk.call(stream, child, pool, options, done);
          });
        } else {
          next();
        }
      });
    }
  }

  /**
   * include current file and flush status
   *
   * @returns {void}
   */
  function flush() {
    // push file to stream
    stream.push(vinyl);

    // all file include
    if (status.parent === null) {
      done();
    } else if (status.parent.next !== null) {
      // run parent next dependencies
      status.parent.next();
    }

    // change cache status
    status.next = null;
    status.included = true;

    // clean parent
    if (status.parent !== null) {
      delete status.parent;
    }
  }

  // bootstrap
  if (status.included || !pkg) {
    flush();
  } else {
    gutil.async.series(pkg.include, transform, flush);
  }
}

/**
 * include dependencies file
 *
 * @param vinyl
 * @param pool
 * @param options
 * @param done
 * @returns {void}
 */
function includeDeps(vinyl, pool, options, done) {
  // return if include not equal 'all' and 'relative'
  if (options.include !== 'all' && options.include !== 'relative') {
    // push file to stream
    this.push(vinyl);

    // free memory
    pool = null;

    return done();
  }

  // set pool cache
  pool[vinyl.path] = {
    next: null,
    parent: null,
    included: false
  };

  // bootstrap
  walk.call(this, vinyl, pool, options, function() {
    // free memory
    pool = null;

    // callback
    done();
  });
}
