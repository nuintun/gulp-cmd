/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

var fs = require('fs'),
  crequire = require('./crequire');

var code = fs.readFileSync('./selectize.js', { encoding: 'utf8' });
console.time('crequire');
code = JSON.stringify(crequire(code, true), null, 2);
console.log(code);
console.timeEnd('crequire');