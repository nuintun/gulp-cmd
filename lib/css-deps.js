/**
 * Created by Newton on 2015/5/9.
 */

'use strict';

var is = require('is');
var css = require('css');

/**
 * get css resource uri
 * @param src
 * @param replace
 * @param onpath
 * @param prefix
 * @returns {*}
 */

function cdeps(src, replace, onpath, prefix){
  if (Buffer.isBuffer(src)) src = src.toString();

  var ast = css.parse(src);
  var rules = ast.stylesheet.rules;
  var PATHRE = /url\(["']?(.*?)["']?\)/gi;
  var IMPORTRE = /url\(["']?(.*?)["']?\)|['"](.*?)['"]/gi;

  replace = is.fn(replace) ? replace : undefined;

  if (!replace) {
    onpath = prefix = undefined;
  } else {
    onpath = is.fn(onpath) ? onpath : undefined;

    if (is.string(onpath)) {
      prefix = onpath;
    } else {
      prefix = is.string(prefix) ? prefix : undefined;
    }
  }

  // traverse
  function traverse(rules, parent){
    var imports = [];

    // filter rules
    parent.rules = rules.filter(function (rule){
      PATHRE.lastIndex = 0;
      IMPORTRE.lastIndex = 0;

      // if has rules call traverse
      if (rule.rules) {
        imports = imports.concat(traverse(rule.rules, rule));
      } else {
        // delete charset
        if (rule.type === 'charset') {
          return false;
        }

        // process import
        if (rule.type === 'import') {
          var match = IMPORTRE.exec(rule.import);

          if (match) {
            var meta = {
              type: rule.type,
              path: match[1] || match[2]
            };

            imports.push(meta.path);

            // replace import
            if (replace) {
              var path = replace(meta.path, meta.type);

              if (is.string(path) && path.trim()) {
                rule.import = rule.import.replace(meta.path, path);
              } else if (path === false) {
                return false;
              }
            }
          }

          return true;
        }

        // process css resource
        if (onpath && rule.declarations) {
          rule.declarations.forEach(function (declaration){
            var match = PATHRE.exec(declaration.value);

            if (match) {
              meta = {
                property: declaration.property,
                path: match[1]
              };

              var path = onpath(meta.path, meta.property);

              // replace resource path
              if (is.string(path) && path.trim()) {
                declaration.value = declaration.value.replace(meta.path, path);
              }
            }
          });
        }

        // process prefix
        if (prefix && rule.selectors) {
          rule.selectors = rule.selectors.map(function (selector){
            // handle :root selector {}
            if (selector.indexOf(':root') === 0) {
              return ':root ' + prefix + ' ' + selector.replace(':root', '');
            }

            return prefix + ' ' + selector;
          });
        }
      }

      return true;
    });

    return imports;
  }

  // get import
  var imports = traverse(rules, ast.stylesheet);

  // if replace is true, return code else all import
  if (replace) {
    return css.stringify(ast, { compress: true });
  } else {
    return imports;
  }
}

/**
 * Exports module.
 */

module.exports = cdeps;
