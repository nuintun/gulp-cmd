/**
 * @module json
 * @license MIT
 * @version 2018/03/20
 */

import * as utils from '../../utils';

/**
 * @function jsonPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
export default function jsonPackager(vinyl, options) {
  const root = options.root;
  const referer = vinyl.path;
  const dependencies = new Set();
  const id = utils.resolveModuleId(vinyl, options);
  const code = `module.exports = ${vinyl.contents.toString()};`;
  const contents = id ? utils.wrapModule(id, dependencies, code, options) : vinyl.contents;
  const path = utils.addExt(referer);

  return { path, dependencies, contents };
}
