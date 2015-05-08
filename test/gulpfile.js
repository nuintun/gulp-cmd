/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var is = require('is');
var path = require('path');
var gulp = require('gulp');
var through = require('through2');
var transport = require('../lib/transport');

function extendOption(options){
  var defaults = {
    alias: { 'class': 'base/class/1.2.0/class' }, // The alias info
    paths: {}, // The paths info
    vars: {}, // The vars info
    ignore: [], // Omit the given dependencies when transport
    wwwroot: '',
    idleading: '{{name}}/{{version}}/{{file}}', // The id prefix template that can use pkg as it's data
    rename: null,
    include: 'relative'
  };

  if (!options) return defaults;

  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      var value = options[key];

      if (value !== undefined && value !== null) {
        defaults[key] = value;
      }
    }
  }

  if (!is.string(defaults.wwwroot)) {
    throwError('options.wwwroot\'s value should be string');
  }

  defaults.wwwroot = path.join(process.cwd(), defaults.wwwroot);

  return defaults;
}

function listen(){
  return through.obj(function (file, encoding, done){
    console.log('\n' + JSON.stringify(file.package, null, 2));

    this.push(file);
    done();
  });
}

gulp.task('default', function (){
  gulp.src('assets/js/**/*.*', { base: 'assets/js' })
    .pipe(transport(extendOption({ css2js: true })))
    .pipe(listen()); //.pipe(gulp.dest('dist/js'));

  gulp.src('assets/css/**/*.*', { base: 'assets/css' })
    .pipe(transport(extendOption()))
    .pipe(listen()); //.pipe(gulp.dest('dist/css'));
});

gulp.task('watch', function (){
  gulp.watch('base/**/base.js', ['default']);
});