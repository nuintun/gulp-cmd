/**
 * Created by nuintun on 2015/5/7.
 */

'use strict';

var html = require('./html');

// default plugins
module.exports = {
  tpl: html,
  html: html,
  js: require('./js'),
  css: require('./css'),
  json: require('./json'),
  other: require('./other')
};
