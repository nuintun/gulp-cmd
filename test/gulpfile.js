/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var through = require('through2');
var common = require('../lib/common');

function listen(){
  return through.obj(function (file, encoding, done){
    if (file.isNull()) {
      return done(null, file);
    }

    if (file.isStream()) {
      return done(new Error('Streaming not supported.'));
    }

    common.transportDeps(file, { alias: { 'class': 'base/class/1.2.0/class' } });

    this.push(file);
    done();
  });
}

gulp.task('default', function (){
  gulp.src('base/base/1.2.0/base.js', { base: process.cwd() })
    .pipe(listen())
    .pipe(gulp.dest('build'));
});