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

  replace = is.fn(replace) ? replace : undefined;

  if (replace) {
    onpath = is.fn(onpath) ? onpath : undefined;

    if (is.string(onpath)) {
      prefix = onpath;
    } else {
      prefix = is.string(prefix) ? prefix : undefined;
    }
  } else {
    onpath = prefix = undefined;
  }

  try {
    var ast = css.parse(src);
  } catch (e) {
    return replace ? src : [];
  }

  var rules = ast.stylesheet.rules;
  var PATHRE = /url\(["']?(.*?)["']?\)/gi;
  var IMPORTRE = /url\(["']?(.*?)["']?\)|['"](.*?)['"]/gi;

  // traverse
  function traverse(rules, parent){
    var deps = [];

    // filter rules
    parent.rules = rules.filter(function (rule){
      // if has rules call traverse
      if (rule.rules) {
        deps = deps.concat(traverse(rule.rules, rule));
      } else {
        // delete charset
        if (rule.type === 'charset') {
          return false;
        }

        // process import
        if (rule.type === 'import') {
          var keepImport = true;

          if (IMPORTRE.test(rule.import)) {
            rule.import = rule.import.replace(IMPORTRE, function (){
              var source = arguments[0];
              var src = arguments[1] || arguments[2];

              // collect dependencies
              deps.push(src);

              // replace import
              if (replace) {
                var path = replace(src, rule.type);

                if (is.string(path) && path.trim()) {
                  return source.replace(src, path);
                } else if (path === false) {
                  keepImport = false;
                }

                return source;
              }
            });
          }

          return keepImport;
        }

        // process css resource
        if (onpath && rule.declarations) {
          rule.declarations.forEach(function (declaration){
            if (PATHRE.test(declaration.value)) {
              declaration.value = declaration.value.replace(PATHRE, function (){
                var source = arguments[0];
                var src = arguments[1];
                var path = onpath(src, declaration.property);

                // replace resource path
                if (is.string(path) && path.trim()) {
                  return source.replace(src, path);
                } else {
                  return source;
                }
              });
            }
          });
        }

        // process prefix
        if (prefix && rule.selectors) {
          rule.selectors = rule.selectors.map(function (selector){
            // handle :root selector {}
            if (selector.indexOf(':root') === 0) {
              return selector.replace(':root', ':root ' + prefix);
            }

            return prefix + ' ' + selector;
          });
        }
      }

      return true;
    });

    return deps;
  }

  // get import
  var deps = traverse(rules, ast.stylesheet);

  // if replace is true, return code else all import
  if (replace) {
    return css.stringify(ast, { compress: true, sourcemap: false });
  } else {
    return deps;
  }
}

/**
 * exports module.
 */
module.exports = cdeps;
