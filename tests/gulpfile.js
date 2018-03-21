/**
 * @module gulpfile
 * @license MIT
 * @version 2017/10/24
 */

'use strict';

const fs = require('fs');
const gulp = require('gulp');
const bunder = require('../dist/index');
const relative = require('path').relative;
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

function hasArgv(argv) {
  return ARGV.includes(argv);
}

let uid = 0;
const files = new Map();
const useMap = hasArgv('--map');
const combine = hasArgv('--combine');
const map = (path, resolved) => {
  if (!useMap) return path;

  if (files.has(resolved)) {
    return files.get(resolved);
  }

  path = String(uid++);

  files.set(resolved, path);

  return path;
};

/**
 * @function build
 */
function build() {
  return gulp
    .src('assets/view/**/*.js', { base: 'assets' })
    .pipe(
      through((vinyl, enc, next) => {
        bunder.logger('Building', bunder.chalk.green(vinyl.relative.replace(/[\\/]/g, '/')));
        next(null, vinyl);
      })
    )
    .pipe(bunder({ base, alias, map, combine }))
    .pipe(
      through(
        (vinyl, enc, next) => {
          next(null, vinyl);
        },
        next => {
          const json = {};

          files.forEach((value, key) => {
            json[relative(base, key).replace(/[\\/]/g, '/')] = value;
          });

          fs.writeFile('manifest.json', JSON.stringify(json, null, 2), error => {
            bunder.logger('Building', bunder.chalk.green('manifest.json'));
            next();
          });
        }
      )
    )
    .pipe(gulp.dest('dist'));
}

// Register task
gulp.task('default', build);
