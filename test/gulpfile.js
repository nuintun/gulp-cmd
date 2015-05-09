/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var util = require('../lib/util');
var colors = util.colors;
var through = require('through2');
var transport = require('../index');

function listen(){
  return through.obj(function (vinyl, encoding, done){
    if (vinyl.isNull()) {
      // return empty file
      return done(null, vinyl);
    }

    if (vinyl.isStream()) {
      return callback(util.throwError('streaming not supported.'));
    }

    console.log('\n');
    console.log(colors.infoBold(vinyl.path));
    console.log('\n');
    console.log(colors.verboseBold(JSON.stringify(vinyl.package, null, 2)));
    console.log('\n');

    this.push(vinyl);
    done();
  });
}

var alias = { 'class': 'base/class/1.2.0/class' };

gulp.task('default', function (){
  gulp.src('assets/js/**/base.js', { base: 'assets/js' })
    .pipe(transport({ alias: alias }))
    //.pipe(listen())
    //.pipe(gulp.dest('dist/js'))
    .on('end', function (){
      console.log('  ---------------all transport end---------------');
    });

  //gulp.src('assets/css/**/*.*', { base: 'assets/css' })
  //  .pipe(transport())
  //  .pipe(listen())
  //  //.pipe(gulp.dest('dist/css'))
  //  .on('end', function (){
  //    console.log('  ---------------all transport end---------------');
  //  });
});

gulp.task('watch', function (){
  gulp.watch('assets/js/**/*.*', function (e){
    if (e.type !== 'deleted') {
      return gulp.src(e.path, { base: 'assets/js' })
        .pipe(transport({ alias: alias }))
        .pipe(listen())
        //.pipe(gulp.dest('dist/js'))
        .on('end', function (){
          console.log('  ---------------all transport end---------------');
        });
    }
  });

  gulp.watch('assets/css/**/*.*', function (e){
    if (e.type !== 'deleted') {
      return gulp.src(e.path, { base: 'assets/css' })
        .pipe(transport())
        .pipe(listen())
        //.pipe(gulp.dest('dist/css'))
        .on('end', function (){
          console.log('  ---------------all transport end---------------');
        });
    }
  });
});