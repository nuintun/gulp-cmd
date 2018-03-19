/**
 * @module gulpfile
 * @license MIT
 * @version 2017/10/24
 */

'use strict';

const gulp = require('gulp');
const through = require('@nuintun/through');

gulp.task('default', function() {
  return gulp
    .src('rollup.1.js', { base: 'assets' })
    .pipe(
      through(function(chunk, enc, next) {
        console.log(chunk.relative);

        chunk.contents = Buffer.from('aaa');

        next(null, chunk);
      })
    )
    .pipe(gulp.dest('dist'));
});
