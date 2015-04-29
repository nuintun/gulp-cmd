/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

var fs = require('fs'),
  crequire = require('./crequire');

var code = fs.readFileSync('./cmd.js', { encoding: 'utf8' });
console.log(crequire.parse(code));