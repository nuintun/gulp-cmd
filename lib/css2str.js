/**
 * Created by nuintun on 2015/5/7.
 */

'use strict';

var css = require('css');

module.exports = function (code, options){
  options || (options = {});

  if (Buffer.isBuffer(code)) code = code.toString();

  var ast = css.parse(code);

  if (options.prefix) {
    var rules = ast.stylesheet.rules;

    ast.stylesheet.rules = parseRules(rules, options.prefix);
  }

  return css.stringify(ast, { compress: true })
    .replace(/\\/g, '\\\\') // replace ie hack: https://github.com/spmjs/spm/issues/651
    .replace(/'/g, '"');
};

function parseRules(rules, prefix){
  return rules.map(function (o){
    if (o.selectors) {
      o.selectors = o.selectors.map(function (selector){
        // handle :root selector {}
        if (selector.indexOf(':root') === 0) {
          return ':root ' + prefix + ' ' + selector.replace(':root', '');
        }

        return prefix + ' ' + selector;
      });
    }

    if (o.rules) {
      o.rules = parseRules(o.rules, prefix);
    }

    return o;
  });
}