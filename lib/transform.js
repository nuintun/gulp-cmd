/**
 * @module transform
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const through = require('@nuintun/through');
const gutil = require('@nuintun/gulp-util');

const join = path.join;
const relative = path.relative;

/**
 * @function include
 * @param {Object} options
 * @returns {Stream}
 */
module.exports = function(options) {
  const configure = utils.initOptions(options);

  // Debug
  utils.debug('cwd: %p', gutil.normalize(gutil.cwd));

  // Stream
  return through(function(vinyl, encoding, next) {
    vinyl = gutil.wrapVinyl(vinyl);

    // Throw error if stream vinyl
    if (vinyl.isStream()) {
      return next(gutil.throwError('streaming not supported.'));
    }

    // Return empty vinyl
    if (vinyl.isNull()) {
      return next(null, vinyl);
    }

    const path = gutil.pathFromCwd(vinyl.path);

    // clone options
    options = gutil.extend(true, {}, configure);

    // lock wwwroot
    gutil.readonlyProperty(options, 'wwwroot');
    // lock plugins
    gutil.readonlyProperty(options, 'plugins');

    // transport
    utils.transport(vinyl, options, (error, vinyl, options) => {
      // show error message
      if (error) {
        utils.print(gutil.chalk.reset.red.bold(gutil.inspectError(error)) + '\x07');
      }

      let pool = {};
      const pkg = vinyl.package;
      const start = gutil.blankVinyl(vinyl);
      const end = gutil.blankVinyl(vinyl);

      // set start and end file status
      start.concat = gutil.CONCAT_STATUS.START;
      end.concat = gutil.CONCAT_STATUS.END;

      // compute include
      options.include = gutil.isFunction(options.include)
        ? options.include(pkg.id || null, vinyl.path)
        : options.include;

      // debug
      utils.debug('concat: %p start', path);
      // push start blank vinyl
      this.push(start);
      // include dependencies files
      includeDeps.call(this, vinyl, pool, options, () => {
        // push end blank vinyl
        this.push(end);

        // free memory
        pool = null;

        // debug
        utils.debug('concat: %p ...ok', path);
        next();
      });
    });
  });
};

/**
 * @function vinylFile
 * @description Create a new vinyl
 * @param {string} path
 * @param {string} cwd
 * @param {string} base
 * @param {Function} done
 * @param {Function} fail
 */
function vinylFile(path, cwd, base, done, fail) {
  // Read file
  const readFile = (path, stat) => {
    fs.readFile(path, (error, data) => {
      if (error) return fail(error);

      done(
        new gutil.Vinyl({
          path: path,
          cwd: cwd,
          base: base,
          stat: stat,
          contents: data
        })
      );
    });
  };

  // Read file use origin path
  fs.stat(path, (error, stat) => {
    if (error) {
      path = utils.hideExt(path, true);

      // Read file use hide extname path
      fs.stat(path, (error, stat) => {
        if (error) return fail(error);

        readFile(path, stat);
      });
    } else {
      readFile(path, stat);
    }
  });
}

/**
 * @function walk
 * @param {Vinyl} vinyl
 * @param {Object} pool
 * @param {Object} options
 * @param {Function} done
 */
function walk(vinyl, pool, options, done) {
  const status = pool[vinyl.path];

  /**
   * @function transform
   * @description Transport dependence file
   * @param {Object} module
   * @param {Function} next
   */
  const transform = (module, next) => {
    const path = module.path;

    if (options.ignore[path] || pool[path] || (options.include === 'relative' && !gutil.isRelative(module.id))) {
      return next();
    }

    // Create a vinyl file
    vinylFile(
      path,
      gutil.cwd,
      options.base,
      child => {
        // Debug
        utils.debug('include: %r', child.path);
        // Transport file
        utils.transport(child, options, (error, child, options) => {
          // Show error message
          if (error) {
            utils.print(gutil.chalk.reset.red.bold(gutil.inspectError(error)) + '\x07');
          }

          // Cache next
          status.next = next;
          // Add cache status
          pool[child.path] = {
            next: null,
            parent: status,
            included: false
          };

          // Walk
          walk.call(this, child, pool, options, done);
        });
      },
      error => {
        utils.print(
          'module: %s in %s is %s',
          gutil.chalk.reset.yellow.bold(module.id),
          gutil.chalk.reset.yellow.bold(gutil.pathFromCwd(vinyl.path)),
          error.code
        );

        next();
      }
    );
  };

  /**
   * @function flush
   * @description Include current file and flush status
   */
  const flush = () => {
    // Push file to stream
    if (!status.included) {
      this.push(vinyl);

      // Change cache status
      status.next = null;
      status.included = true;
    }

    const parent = status.parent;

    // All file include
    if (parent === null || parent.next === null) {
      done();
    } else {
      // Run parent next dependencies
      parent.next();

      // Clean parent
      delete status.parent;
    }
  };

  const pkg = vinyl.package;

  // Bootstrap
  if (status.included || !pkg) {
    flush();
  } else {
    gutil.async.series(pkg.include, transform, flush);
  }
}

/**
 * @function includeDeps
 * @description Include dependencies file
 * @param {Vinyl} vinyl
 * @param {Object} pool
 * @param {Object} options
 * @param {Function} done
 */
function includeDeps(vinyl, pool, options, done) {
  // Return if include not equal 'all' and 'relative'
  if (options.include !== 'all' && options.include !== 'relative') {
    // Push file to stream
    this.push(vinyl);

    // Free memory
    pool = null;

    return done();
  }

  // Set pool cache
  pool[vinyl.path] = {
    next: null,
    parent: null,
    included: false
  };

  // Bootstrap
  walk.call(this, vinyl, pool, options, () => {
    // free memory
    pool = null;

    // callback
    done();
  });
}
