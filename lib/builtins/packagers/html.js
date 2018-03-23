/**
 * @module html
 * @license MIT
 * @version 2018/03/20
 */

import * as utils from '../../utils';

/**
 * @function htmlPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
export default function htmlPackager(vinyl, options) {
  const root = options.root;
  const referer = vinyl.path;
  const dependencies = new Set();
  const id = utils.resolveModuleId(vinyl.path, options);
  const code = `module.exports = ${JSON.stringify(vinyl.contents.toString())};`;
  const contents = id ? utils.wrapModule(id, dependencies, code, options) : vinyl.contents;
  const path = utils.addExt(referer);

  return { path, dependencies, contents };
}
