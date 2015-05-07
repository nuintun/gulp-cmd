/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var through = require('through2');
var common = require('../lib/common');
var util = require('../lib/util');
var js = require('../lib/plugins/js');
var css2js = require('../lib/plugins/css2js');

function extendOption(options){
  var opt = {
    alias: { 'class': 'base/class/1.2.0/class' },
    rename: { debug: false },
    ignore: [], // Omit the given dependencies when transport
    idleading: '{{name}}/{{version}}/{{file}}', // The id prefix template that can use pkg as it's data
    include: 'relative'
  };

  if (!options) return opt;

  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      var val = options[key];

      if (val !== undefined && val !== null) {
        opt[key] = val;
      }
    }
  }

  return opt;
}

function listen(options){
  return through.obj(function (file, encoding, done){
    if (file.isNull()) {
      return done(null, file);
    }

    if (file.isStream()) {
      return done(new Error('Streaming not supported.'));
    }

    console.time('\ntransport');
    common.transportId(file, options);
    common.transportDeps(file, options);
    console.timeEnd('\ntransport');

    console.log('\n' + JSON.stringify(file.package, null, 2));

    this.push(file);
    done();
  });
}

gulp.task('default', function (){
  gulp.src('base/**/base.css', { base: process.cwd() })
    .pipe(css2js(extendOption())); //.pipe(gulp.dest('dist'));
});

gulp.task('watch', function (){
  gulp.watch('base/**/base.js', ['default']);
});