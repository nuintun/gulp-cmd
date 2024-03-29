/**
 * @module gulpfile
 * @license MIT
 * @version 2017/10/24
 */

'use strict';

const gulp = require('gulp');
const fs = require('fs-extra');
const bundler = require('../index');
const { relative } = require('path');
const through = require('@nuintun/through');

const base = 'assets';
const alias = {
  jquery: 'base/jquery/1.11.3/jquery',
  base: 'base/base/1.2.0/base',
  class: 'base/class/1.2.0/class',
  events: 'base/events/1.2.0/events',
  widget: 'base/widget/1.2.0/widget',
  template: 'base/template/3.0.3/template',
  templatable: 'base/templatable/0.10.0/templatable',
  'iframe-shim': 'util/iframe-shim/1.1.0/iframe-shim',
  position: 'util/position/1.1.0/position',
  messenger: 'util/messenger/2.1.0/messenger',
  overlay: 'common/overlay/1.2.0/',
  dialog: 'common/dialog/1.5.1/dialog',
  confirmbox: 'common/dialog/1.5.1/confirmbox'
};

const ARGV = process.argv.slice(2);

/**
 * @function hasArgv
 * @param {string} argv
 */
function hasArgv(argv) {
  return ARGV.includes(argv);
}

let uid = 0;

const files = new Map();
const useMap = hasArgv('--map');
const combine = hasArgv('--combine');
const map = (path, resolved) => {
  if (!useMap) {
    if (path.startsWith('/')) {
      path = path.replace(/^\/assets/, '/dist');
    }

    return path;
  }

  if (files.has(resolved)) {
    return files.get(resolved);
  }

  path = String(uid++);

  files.set(resolved, path);

  return path;
};

const css = {
  onpath(_prop, path, referer) {
    if (/^(?:[a-z0-9.+-]+:)?\/\/|^data:\w+?\/\w+?[,;]/i.test(path)) {
      return path;
    }

    if (!path.startsWith('/')) {
      path = join(dirname(referer), path);
      path = '/' + unixify(relative(root, path));
    }

    path = path.replace(/^\/assets/, '/dist');

    return path;
  }
};

const plugins = [
  {
    name: 'Adam',
    moduleDidLoaded(_path, contents, _options) {
      bundler.logger.log('[hook]', bundler.chalk.cyan('moduleDidLoaded'));

      return contents;
    },
    moduleDidParsed(_path, contents, _options) {
      bundler.logger.log('[hook]', bundler.chalk.cyan('moduleDidParsed'));

      return contents;
    },
    moduleDidTransformed(_path, contents, _options) {
      bundler.logger.log('[hook]', bundler.chalk.cyan('moduleDidTransformed'));

      return contents;
    },
    moduleDidCompleted(_path, contents, _options) {
      bundler.logger.log('[hook]', bundler.chalk.cyan('moduleDidCompleted'));

      return contents;
    }
  }
];

/**
 * @function unixify
 * @param {string} path
 */
function unixify(path) {
  return path.replace(/\\/g, '/');
}

/**
 * @function build
 */
function build() {
  fs.removeSync('dist');
  fs.removeSync('manifest.json');

  return gulp
    .src(combine ? 'assets/view/**/*.js' : 'assets/**/*.js', { base: 'assets' })
    .pipe(
      through((vinyl, _enc, next) => {
        bundler.logger.log('Building', bundler.chalk.green(unixify(vinyl.relative)));

        next(null, vinyl);
      })
    )
    .pipe(bundler({ base, alias, map, css, combine, plugins }))
    .pipe(
      through(
        (vinyl, _enc, next) => {
          next(null, vinyl);
        },
        next => {
          if (!useMap) return next();

          const json = {};
          const root = process.cwd();

          files.forEach((value, key) => {
            json[unixify(relative(root, key))] = value;
          });

          fs.writeFile('manifest.json', JSON.stringify(json, null, 2), error => {
            bundler.logger.log('Building', bundler.chalk.green('manifest.json'));
            next();
          });
        }
      )
    )
    .pipe(gulp.dest('dist'));
}

// Register task
gulp.task('default', build);
