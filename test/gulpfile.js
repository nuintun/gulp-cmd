/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var through = require('through2');

function listen(){
  return through.obj(function (file, encoding, done){
    Object.keys(file).forEach(function (key){
      key !== '_contents' && console.log(key, ' --- ', JSON.stringify(file[key], null, 2));
    });

    console.log(file.path);

    this.push(file);
    done();
  });
}

gulp.task('default', function (){
  gulp.src('base/base/1.2.0/base.js', { base: process.cwd() })
    .pipe(listen())
    .pipe(gulp.dest('dist'));
});