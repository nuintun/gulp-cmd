/**
 * @module html
 * @license MIT
 * @version 2018/03/26
 */

import * as utils from '../../utils';

/**
 * @namespace htmlPackager
 */
export default {
  /**
   * @method resolve
   * @param {string} path
   * @returns {string}
   */
  resolve(path) {
    return utils.addExt(path);
  },
  /**
   * @method parse
   * @param {string} path
   * @param {string} contents
   * @param {Object} options
   * @returns {Object}
   */
  parse(path, contents, options) {
    // Metadata
    const id = utils.resolveModuleId(path, options);
    const dependencies = new Set();
    const modules = new Set();

    return { id, dependencies, contents, modules };
  },
  /**
   *
   * @param {string} id
   * @param {Set} dependencies
   * @param {string} contents
   * @param {Object} options
   * @returns {string}
   */
  transform(id, dependencies, contents, options) {
    contents = `module.exports = ${JSON.stringify(contents)};`;

    return utils.wrapModule(id, dependencies, contents, options);
  }
};
