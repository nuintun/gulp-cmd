/**
 * Created by nuintun on 2015/4/28.
 */

'use strict';

var util = require('../util');
var common = require('../common');
var debug = require('debug')('transport:css');

function parser(options){
  return common.createStream(options, 'css', transport);
}

function transport(file, options){
  if (!options.css2js) {
    common.transportId(file, options, true);
    common.transportCssDeps(file, options);
  }

  return file;
}

module.exports = parser;