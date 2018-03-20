/**
 * @module gulpfile
 * @license MIT
 * @version 2017/10/24
 */

'use strict';

const gulp = require('gulp');
const bunder = require('../dist/index');

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

let uid = 0;
const files = new Map();
const map = (path, resolved) => {
  if (files.has(resolved)) {
    return files.get(resolved);
  }

  path = String(uid++);

  files.set(resolved, path);

  return path;
};

gulp.task('default', function() {
  return gulp
    .src('assets/view/**/*.js', { base: 'assets' })
    .pipe(bunder({ base, alias }))
    .pipe(gulp.dest('dist'));
});
