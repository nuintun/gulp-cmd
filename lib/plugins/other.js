/**
 * Created by Newton on 2015/5/9.
 */

'use strict';

var util = require('../util');

function transport(vinyl){
  return vinyl;
}

/**
 * exports module.
 */
module.exports = util.plugin('other', transport);
