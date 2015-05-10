/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var util = require('../lib/util');
var colors = util.colors;
var transport = require('../index');
var uglify = require('gulp-uglify');

var alias = { 'base': 'base/base/1.2.0/base' };
var options = {
  alias: alias,
  include: function (id){
    return id.indexOf('view') === 0 ? 'all' : 'relative';
  }
};

function complete(){
  var now = new Date();

  console.log(
    '  %s [%s] %s',
    colors.verboseBold('gulp-cmd'),
    now.toLocaleString(),
    colors.infoBold('build complete ...')
  );
}

gulp.task('default', function (){
  gulp.src('assets/js/**/*.js', { base: 'assets/js' })
    .pipe(transport(options))
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'))
    .on('end', complete);

  gulp.src('assets/js/**/*.!(js|css|json|tpl|html)')
    .pipe(gulp.dest('dist/js'));
});

gulp.task('watch', function (){
  gulp.src('assets/js/**/*.*', { base: 'assets/js' })
    .pipe(transport({ alias: alias, include: 'self' }))
    .pipe(gulp.dest('dist/js'))
    .on('end', complete);

  var timer = null;

  gulp.watch('assets/js/**/*.*', function (e){
    if (e.type !== 'deleted') {
      clearTimeout(timer);

      timer = setTimeout(function (){
        gulp.src(e.path, { base: 'assets/js' })
          .pipe(transport({ alias: alias, include: 'self', cache: false }))
          .pipe(gulp.dest('dist/js'))
          .on('end', complete);
      }, 200);
    }
  });
});
