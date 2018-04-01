/**
 * @module js
 * @license MIT
 * @version 2018/03/26
 */

import jsDeps from 'cmd-deps';
import * as utils from '../../utils';
import * as gutil from '@nuintun/gulp-util';

/**
 * @namespace jsPackager
 */
export default {
  /**
   * @property module
   * @type {boolean}
   */
  module: true,
  /**
   * @method resolve
   * @param {string} path
   * @returns {string}
   */
  resolve(path) {
    return path;
  },
  /**
   * @method parse
   * @param {string} path
   * @param {string} contents
   * @param {Object} options
   * @returns {Object}
   */
  parse(path, contents, options) {
    const root = options.root;
    const base = options.base;

    // Metadata
    const id = utils.resolveModuleId(path, options);
    const dependencies = new Set();
    const modules = new Set();

    // Parse module
    const meta = jsDeps(
      contents,
      (dependency, flag) => {
        dependency = utils.parseAlias(dependency, options.alias);

        // Only collect local bependency
        if (!gutil.isUrl(dependency)) {
          // Normalize
          dependency = gutil.normalize(dependency);

          // If path end with /, use index.js
          if (dependency.endsWith('/')) dependency += 'index.js';

          // Resolve dependency
          let resolved = utils.resolve(dependency, path, { root, base });

          // Only collect require no flag
          if (flag === null) {
            // If has ext and module can read
            if (utils.fileExt(resolved) && gutil.fsSafeAccess(resolved)) {
              !utils.isIgnoreModule(resolved, options) && modules.add(resolved);
            } else {
              // Module can't read, add ext test again
              resolved = utils.addExt(resolved);

              // Module can read
              if (gutil.fsSafeAccess(resolved)) {
                !utils.isIgnoreModule(resolved, options) && modules.add(resolved);
              } else {
                // Relative path from cwd
                const rpath = JSON.stringify(gutil.path2cwd(path));

                // Output warn
                gutil.logger.warn(
                  gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`),
                  '\x07'
                );
              }
            }
          }

          // Parse map
          dependency = gutil.parseMap(dependency, resolved, options.map);
          dependency = gutil.normalize(dependency);
          dependency = utils.hideExt(dependency);

          // The seajs has hacked css before 3.0.0
          // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
          // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
          if (utils.fileExt(dependency) === '.css') dependency = utils.addExt(dependency);

          // Add dependency
          dependencies.add(dependency);
        }

        // Return dependency
        return dependency;
      },
      {
        flags: options.js.flags,
        allowReturnOutsideFunction: true
      }
    );

    // Get contents
    contents = meta.code;

    return { id, dependencies, contents, modules };
  },
  /**
   * @method transform
   * @param {string} id
   * @param {Set} dependencies
   * @param {string} contents
   * @param {Object} options
   * @returns {string}
   */
  transform(id, dependencies, contents, options) {
    return contents;
  }
};
