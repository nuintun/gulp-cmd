/**
 * @module js
 * @license MIT
 * @version 2018/03/26
 */

import jsDeps from 'cmd-deps';
import * as utils from '../../utils';
import * as gutil from '@nuintun/gulp-util';

/**
 * @function jsPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
export default function jsPackager(vinyl, options) {
  const root = options.root;
  const base = options.base;
  const modules = new Set();
  const referer = vinyl.path;
  const ignore = options.ignore;
  const dependencies = new Set();

  // Parse module
  const meta = jsDeps(
    vinyl.contents,
    (dependency, flag) => {
      dependency = utils.parseAlias(dependency, options.alias);

      // Only collect local bependency
      if (!gutil.isUrl(dependency)) {
        // Normalize
        dependency = gutil.normalize(dependency);

        // If path end with /, use index.js
        if (dependency.endsWith('/')) dependency += 'index.js';

        // Resolve dependency
        let resolved = utils.resolve(dependency, referer, { root, base });

        // Only collect require no flag
        if (flag === null) {
          // Module can read
          if (utils.fsSafeAccess(resolved)) {
            !ignore.has(resolved) && modules.add(resolved);
          } else {
            // Module can't read, add ext .js test again
            resolved = utils.addExt(resolved);

            // Module can read
            if (utils.fsSafeAccess(resolved)) {
              !ignore.has(resolved) && modules.add(resolved);
            } else {
              // Relative referer from cwd
              const rpath = JSON.stringify(gutil.path2cwd(referer));

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
        if (utils.isCSSFile(dependency)) dependency = utils.addExt(dependency);

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

  // Rewrite path
  const path = referer;
  // Get contents
  const contents = meta.code;
  // Resolve module id
  const id = utils.resolveModuleId(referer, options);

  return { id, path, dependencies, contents, modules };
}
