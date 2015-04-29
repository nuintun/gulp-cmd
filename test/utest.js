/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

var fs = require('fs'),
  urequire = require('./urequire');

var code = fs.readFileSync('./selectize.js', { encoding: 'utf8' });
console.time('my-crequire');
console.log(JSON.stringify(urequire.parse(code), null, 2));
console.timeEnd('my-crequire');