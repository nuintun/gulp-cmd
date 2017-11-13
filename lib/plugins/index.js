/**
 * @module index
 * @license MIT
 * @version 2017/11/13
 */

'use strict';

var html = require('./html');

// Default plugins
module.exports = {
  tpl: html,
  html: html,
  js: require('./js'),
  css: require('./css'),
  json: require('./json')
};
