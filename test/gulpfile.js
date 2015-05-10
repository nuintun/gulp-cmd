/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var util = require('../lib/util');
var colors = util.colors;
var transport = require('../index');

var alias = { 'base': 'base/base/1.2.0/base' };

gulp.task('default', function (){
  gulp.src('assets/js/!(view)/**/*.!(css|json|tpl|html)', { base: 'assets/js' })
    .pipe(transport({ alias: alias }))
    .pipe(gulp.dest('dist/js'))
    .on('end', function (){
      console.log(colors.verboseBold('  gulp-cmd ') + colors.infoBold('build complete without errors...'));
    });

  gulp.src('assets/js/view/**/*.!(css|json|tpl|html)', { base: 'assets/js' })
    .pipe(transport({ alias: alias, include: 'all' }))
    .pipe(gulp.dest('dist/js'))
    .on('end', function (){
      console.log(colors.verboseBold('  gulp-cmd ') + colors.infoBold('build complete without errors...'));
    });
});

gulp.task('watch', function (){
  gulp.watch('assets/js/**/*.*', function (e){
    if (e.type !== 'deleted') {
      return gulp.src(e.path, { base: 'assets/js' })
        .pipe(transport({ alias: alias, ignore: ['class'], cache: false }))
        .pipe(gulp.dest('dist/js'))
        .on('end', function (){
          console.log(colors.verboseBold('  gulp-cmd ') + colors.infoBold('build complete without errors...'));
        });
    }
  });
});
