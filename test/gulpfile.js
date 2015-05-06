/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var through = require('through2');
var common = require('../lib/common');
var util = require('../lib/util');

function listen(){
  return through.obj(function (file, encoding, done){
    if (file.isNull()) {
      return done(null, file);
    }

    if (file.isStream()) {
      return done(new Error('Streaming not supported.'));
    }

    common.transportId(file, { rename: { debug: true } });
    common.transportDeps(file, { alias: { 'class': 'base/class/1.2.0/class' }, rename: { debug: true } });

    this.push(file);
    done();
  });
}

gulp.task('default', function (){
  gulp.src('base/**/*.js', { base: process.cwd() })
    .pipe(listen());
});

gulp.task('watch', function (){
  gulp.watch('base/**/*.js', ['default']);
});