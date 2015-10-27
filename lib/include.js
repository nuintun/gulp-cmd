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

        this.push(start);
        status.included[start.path] = true;

        // compute include
        options.include = is.fn(options.include)
          ? options.include(pkg.id || null, vinyl.path)
          : options.include;

        includeDeps.call(this, vinyl, status, options, next);
      });
    } catch (error) {
      // show error message
      util.print(colors.red.bold(error.stack) + '\x07');
      next();
    }
  });
}

/**
 * read file
 * @param path
 * @param parent
 * @param status
 * @param options
 * @param done
 */
function read(path, parent, status, options, done){
  var stream = this;
  var vinyl = vinylFile(path, parent.cwd, parent.base);

  // read file success
  if (vinyl !== null) {
    // push children
    parent.children.push(vinyl.path);
    // debug
    debug('include: %s', colors.magenta(util.pathFromCwd(vinyl.path)));

    // cache included
    status.included[path] = true;

    // transport file
    transport(vinyl, options, function (vinyl, options){
      --parent.waiting;

      walk.call(stream, vinyl, status, options, done);
    });
  } else {
    // debug
    debug('include: %s failed', colors.yellow(util.pathFromCwd(path)));
  }
}

function walk(vinyl, status, options, done){
  if (!status.pool.hasOwnProperty(vinyl.path)) {
    vinyl.waiting = 0;
    vinyl.children = [];
    status.pool[vinyl.path] = vinyl;
  }

  // include
  var include = options.include;

  // return if include not equal 'all' and 'relative'
  if (include !== 'all' && include !== 'relative') {
    done();

    return;
  }

  var stream = this;
  var pkg = vinyl.package;

  if (pkg && Array.isArray(pkg.include)) {
    // dependencies
    pkg.include.forEach(function (module){
      if (module && module.id && module.path) {
        // ignore or included
        if (options.ignore[module.path] || status.included[module.path]) {
          return false;
        }

        switch (include) {
          case 'all':
            ++vinyl.waiting;

            read.call(stream, module.path, vinyl, status, options, done);
            break;
          case 'relative':
            // include all relative file
            if (util.isRelative(module.id)) {
              ++vinyl.waiting;

              read.call(stream, module.path, vinyl, status, options, done);
            }

            break;
          default :
            break;
        }
      }
    });
  } else {
    done();
  }
}

function statusCheck(vinyl, status){
  var stream = this;

  vinyl.children.forEach(function (path){
    var vinyl = status.pool[path];

    if (vinyl.waiting === 0) {
      stream.push(vinyl);

      // clean vinyl
      delete vinyl.waiting;
      delete vinyl.children;
    } else {
      statusCheck.call(vinyl, status);
    }
  });
}

/**
 * include dependencies file
 * @param vinyl
 * @param status
 * @param options
 * @param done
 */
function includeDeps(vinyl, status, options, done){
  done = function (){
    var vinyl = status.pool[vinyl.path];

    if (vinyl) {
      statusCheck.call(vinyl, status);
    } else {
      done();
    }
  };

  walk.call(this, vinyl, status, options, done);
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
