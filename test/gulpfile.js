/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var util = require('../lib/util');
var colors = util.colors;
var transport = require('../index');

var alias = { 'base': 'base/base/1.2.0/base' };
var options = {
  alias: alias,
  include: function (id){
    return id.indexOf('view') === 0 ? 'all' : 'relative';
  }
};

gulp.task('default', function (){
  gulp.src('assets/js/**/*.!(css|json|tpl|html)', { base: 'assets/js' })
    .pipe(transport(options))
    .pipe(gulp.dest('dist/js'))
    .on('end', function (){
      console.log(colors.verboseBold('  gulp-cmd ') + colors.infoBold('build complete ...'));
    });
});

gulp.task('watch', function (){
  gulp.src('assets/js/**/*.*', { base: 'assets/js' })
    .pipe(transport({ alias: alias, include: 'self' }))
    .pipe(gulp.dest('dist/js'))
    .on('end', function (){
      console.log(colors.verboseBold('  gulp-cmd ') + colors.infoBold('build complete ...'));
    });

  gulp.watch('assets/js/**/*.*', function (e){
    if (e.type !== 'deleted') {
      return gulp.src(e.path, { base: 'assets/js' })
        .pipe(transport({ alias: alias, include: 'self', cache: false }))
        .pipe(gulp.dest('dist/js'))
        .on('end', function (){
          console.log(colors.verboseBold('  gulp-cmd ') + colors.infoBold('build complete ...'));
        });
    }
  });
});
