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
