/**
 * @module json
 * @license MIT
 * @version 2018/03/26
 */

import * as utils from '../../utils';

/**
 * @function jsonPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
export default function jsonPackager(vinyl, options) {
  const modules = new Set();
  const referer = vinyl.path;
  const dependencies = new Set();
  const path = utils.addExt(referer);
  const id = utils.resolveModuleId(referer, options);
  const contents = `module.exports = ${vinyl.contents.toString()};`;

  return { id, path, dependencies, contents, modules };
}
