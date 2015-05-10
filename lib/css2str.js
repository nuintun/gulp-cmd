/**
 * Created by nuintun on 2015/5/7.
 */

'use strict';

var css = require('css');

function css2str(code, options){
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
}

function parseRules(rules, prefix){
  return rules.map(function (rule){
    if (rule.selectors) {
      rule.selectors = rule.selectors.map(function (selector){
        // handle :root selector {}
        if (selector.indexOf(':root') === 0) {
          return ':root ' + prefix + ' ' + selector.replace(':root', '');
        }

        return prefix + ' ' + selector;
      });
    }

    if (rule.rules) {
      rule.rules = parseRules(rule.rules, prefix);
    }

    return rule;
  });
}

/**
 * Exports module.
 */

module.exports = css2str;