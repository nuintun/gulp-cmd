/**
 * Created by Newton on 2015/5/9.
 */

'use strict';

var util = require('../util');
var debug = require('debug')('transport:other');

function transport(vinyl){
  return vinyl;
}

/**
 * exports module.
 */

module.exports = common.createParser('other', transport);