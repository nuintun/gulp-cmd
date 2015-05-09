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
 * @returns {*}
 */

function cdeps(src, replace, onpath){
  if (Buffer.isBuffer(src)) src = src.toString();

  var ast = css.parse(src);
  var rules = ast.stylesheet.rules;
  var PATHRE = /url\(["']?(.*?)["']?\)/gi;
  var IMPORTRE = /url\(["']?(.*?)["']?\)|['"](.*?)['"]/gi;

  replace = is.fn(replace) ? replace : undefined;
  onpath = is.fn(onpath) ? onpath : undefined;

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
      }

      return true;
    });

    return imports;
  }

  // get import
  var imports = traverse(rules, ast.stylesheet);

  // if replace is true, return code else all import
  if (replace) {
    if (imports.length) {
      return css.stringify(ast);
    } else {
      return src;
    }
  } else {
    return imports;
  }
}

/**
 * Exports module.
 */

module.exports = cdeps;