/**
 * Created by nuintun on 2015/5/7.
 */

'use strict';

var html = require('./html');

// default plugins
var defaults = {
  tpl: html,
  html: html,
  js: require('./js'),
  css: require('./css'),
  json: require('./json'),
  other: require('./other')
};
