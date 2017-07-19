/*!
 * plugins/index
 * Version: 0.0.1
 * Date: 2017/07/11
 * https://github.com/nuintun/gulp-cmd
 *
 * This is licensed under the MIT License (MIT).
 * For details, see: https://github.com/nuintun/gulp-cmd/blob/master/LICENSE
 */

'use strict';

var html = require('./html');

// default plugins
module.exports = {
  tpl: html,
  html: html,
  js: require('./js'),
  css: require('./css'),
  json: require('./json')
};
