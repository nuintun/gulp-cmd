/**
 * @module index
 * @license MIT
 * @version 2018/03/19
 */

export { default as js } from './js';
export { default as css } from './css';
export { default as json } from './json';

// HTML packager
import html from './html';

// Exports html and tpl packager
export { html, html as tpl };
