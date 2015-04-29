/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

var fs = require('fs'),
  crequire = require('./crequire');

var code = fs.readFileSync('./selectize.js', { encoding: 'utf8' });
console.time('crequire');
console.log(JSON.stringify(crequire.parse(code), null, 2));
console.timeEnd('crequire');