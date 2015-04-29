/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

var gulp = require('gulp'),
  crequire = require('crequire'),
  through2 = require('through2');

gulp.task('default', function (){
  gulp.src('./cmd.js')
    .pipe(through2.obj(function (file){
      //console.log('\r\n', file.history);
      //console.log('\r\n', file.base);
      //console.log('\r\n', file.cwd);
      //console.log('\r\n', JSON.stringify(file.stat, null, 2));
      //console.log('\r\n', file.contents.toString());
      //console.log(JSON.stringify(crequire(file.contents.toString(), true), null, 2));

      console.log(crequire(file.contents.toString(), function (match){
        console.log(JSON.stringify(match, null, 2));

        if (match.path === '{{path}}') {
          return match.string.replace(match.path, 'replace');
        }

        if (match.path === 'init') {
          return match.string.replace(match.path, 'init-replace');
        }

        return match.string;
      }, true))
    }));
});