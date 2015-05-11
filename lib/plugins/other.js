/**
 * Created by Newton on 2015/5/9.
 */

'use strict';

var common = require('../common');

function transport(vinyl){
  return vinyl;
}

/**
 * exports module.
 */

module.exports = common.createParser('other', transport);
