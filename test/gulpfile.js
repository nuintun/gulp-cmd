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

var alias = { 'class': 'base/base/1.2.0/class' };

gulp.task('default', function (){
  gulp.src('assets/js/**/*.*', { base: 'assets/js' })
    .pipe(transport({ alias: alias, ignore: ['class'] }))
    //.pipe(listen())
    .pipe(gulp.dest('dist/js'))
    .on('end', function (){
      console.log('  ---------------all transport end---------------');
    });
});

gulp.task('watch', function (){
  gulp.watch('assets/js/**/*.*', function (e){
    if (e.type !== 'deleted') {
      return gulp.src(e.path, { base: 'assets/js' })
        .pipe(transport({ alias: alias }))
        //.pipe(listen())
        //.pipe(gulp.dest('dist/js'))
        .on('end', function (){
          console.log('  ---------------all transport end---------------');
        });
    }
  });
});