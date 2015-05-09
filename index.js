/**
 * Created by nuintun on 2015/4/27.
 */

'use strict';

var duplexer = require('duplexer2');
var util = require('./lib/util');
var include = require('./lib/include');
var concat = require('./lib/concat');

module.exports = function (options){
  options = util.extendOption(options);

  return duplexer(include(options), concat());
};