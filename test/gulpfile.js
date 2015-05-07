/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var gulp = require('gulp');
var through = require('through2');
var common = require('../lib/common');
var util = require('../lib/util');
var plugins = require('../lib/plugins/');
var transport = require('../lib/transport');
var multipipe = require('multipipe');

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
    console.log('\n' + JSON.stringify(file.package, null, 2));

    this.push(file);
    done();
  });
}

gulp.task('default', function (){
  var ops = {
    stream: {
      '.css': function (opions){
        return multipipe(
          // overide rename for this
          plugins.css(util.extend({}, opions, { rename: function (file){ return file; }, cssjs: true })),
          plugins.css2js(opions)
        );
      }
    }
  };

  gulp.src('assets/js/**/*.css', { base: 'assets/js' })
    .pipe(transport(extendOption(ops)))
    .pipe(listen()); //.pipe(gulp.dest('dist'));

  //gulp.src('assets/css/**/*.css', { base: 'assets/css' })
  //  .pipe(transport(extendOption()))
  //  .pipe(listen()); //.pipe(gulp.dest('dist'));
});

gulp.task('watch', function (){
  gulp.watch('base/**/base.js', ['default']);
});