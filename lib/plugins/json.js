/**
 * Created by nuintun on 2015/5/5.
 */

'use strict';

var util = require('../util');

/**
 * transport
 *
 * @param vinyl
 * @param options
 * @param next
 * @returns {void}
 */
module.exports = function(vinyl, options, next) {
  var id = util.transportId(vinyl, options);

  vinyl.contents = new Buffer(util.wrapModule(id, [], stringify(vinyl)));

  this.push(vinyl);
  next();
};

function stringify(vinyl) {
  var code = vinyl.contents.toString();

  try {
    code = JSON.parse(code);
  } catch (error) {
    // parse json error do noting
  }

  code = 'module.exports = ' + JSON.stringify(code) + ';';

  return code;
}
