/**
 * @module css-loader
 * @license MIT
 * @version 2018/03/23
 * @description Embedding style text in JavaScript code
 */

// Doc and head
var doc = document;
var undef = void 0;
var head = doc.getElementsByTagName('head')[0] || doc.documentElement;

/**
 * @function isString
 * @description Is string
 * @param {any} value
 * @returns {boolean}
 */
function isString(value) {
  return {}.toString.call(value) === '[object String]';
}

/**
 * @function createStyleNode
 * @description Create a style node
 * @returns {HTMLStyleElement}
 */
function createStyleNode() {
  var node = doc.createElement('style');

  // Set type
  node.type = 'text/css';

  // IE
  if (node.styleSheet !== undef) {
    // See http://support.microsoft.com/kb/262161
    if (doc.getElementsByTagName('style').length > 31) {
      throw new Error('Exceed the maximal count of style tags in IE');
    }
  }

  // Adds to dom first to avoid the css hack invalid
  head.appendChild(node);

  return node;
}

// Declare variable
var node;
var cache = '';

/**
 * @function insertStyle
 * @description Insert style
 * @param {HTMLStyleElement} node
 * @param {string} css
 */
function insertStyle(node, css) {
  // IE
  if (node.styleSheet !== undefined) {
    node.styleSheet.cssText = css;
  } else {
    // W3C
    css = doc.createTextNode(css);

    // Insert text node
    if (node.firstChild) {
      node.replaceChild(css, node.firstChild);
    } else {
      node.appendChild(css);
    }
  }
}

/**
 * @function insert
 * @description Insert css text
 * @param {string} css
 */
function insert(css) {
  if (css && isString(css)) {
    // Cache css
    cache += css;

    // Create style node
    if (!node) {
      node = createStyleNode();
    }

    // Insert css
    insertStyle(node, cache);
  }
}

// Exports
module.exports = insert;
