/**
 * @module css-loader
 * @license MIT
 * @version 2018/03/26
 * @description Embedding style text in JavaScript code
 */

// Doc and head
var doc = document;
var head = doc.getElementsByTagName('head')[0] || doc.documentElement;

/**
 * @function createStyleNode
 * @description Create a style node
 * @returns {HTMLStyleElement}
 */
function createStyleNode() {
  var node = doc.createElement('style');

  // Set type
  node.setAttribute('type', 'text/css');

  // IE
  if (node.styleSheet) {
    // See http://support.microsoft.com/kb/262161
    if (doc.getElementsByTagName('style').length > 31) {
      throw new Error('Exceed the maximal count of style tags in IE');
    }
  }

  // For Safari
  if (!window.createPopup) {
    node.appendChild(document.createTextNode(''));
  }

  // Adds to dom first to avoid the css hack invalid
  head.appendChild(node);

  return node;
}

/**
 * @function insertRule
 * @description Insert style rule
 * @param {HTMLStyleElement} node
 * @param {string} css
 * @see https://github.com/substack/insert-css
 */
function insertRule(node, css) {
  // Strip potential UTF-8 BOM if css was read from a file
  if (css.charCodeAt(0) === 0xfeff) {
    css = css.substr(1);
  }

  if (node.styleSheet) {
    // IE
    node.styleSheet.cssText += css;
  } else {
    node.textContent += css;
  }
}

// Create style node
var node = createStyleNode();

/**
 * @exports loader
 * @description Insert css text
 * @param {string} css
 */
module.exports = function(css) {
  css && typeof css === 'string' && insertRule(node, css);
};
