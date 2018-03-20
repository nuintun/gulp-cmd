/**
 * @module js
 * @license MIT
 * @version 2018/03/19
 */

import jsDeps from 'cmd-deps';
import { extname } from 'path';
import * as utils from '../../utils';
import gutil from '@nuintun/gulp-util';

/**
 * @function jsPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
export default function jsPackager(vinyl, options) {
  const deps = new Set();
  const root = options.root;
  const base = options.base;
  const referer = vinyl.path;
  const dependencies = new Set();

  // Parse module
  const meta = jsDeps(
    vinyl.contents,
    (dependency, flag) => {
      dependency = utils.parseAlias(dependency, options.alias);
      dependency = gutil.normalize(dependency);

      // Only collect local bependency
      if (gutil.isLocal(dependency)) {
        // If path end with /, use index.js
        if (dependency.endsWith('/')) dependency += 'index.js';

        // Resolve dependency
        let resolved = utils.resolve(dependency, referer, { root, base });

        // Only collect require no flag
        if (flag === null) {
          // Add extname
          if (!extname(resolved)) {
            resolved = utils.addExt(resolved);
          }

          // Module can read
          if (utils.fsSafeAccess(resolved)) {
            dependencies.add(resolved);
          } else {
            // Module can't read, add ext .js test again
            resolved = utils.addExt(resolved);

            // Module can read
            if (utils.fsSafeAccess(resolved)) {
              dependencies.add(resolved);
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

          // Convert absolute path to relative base path
          if (gutil.isAbsolute(dependency) && dependencies.has(resolved)) {
            try {
              dependency = utils.moduleId(resolved, base);
            } catch (error) {
              // Out of bounds of base
            }
          }
        }

        // Parse map
        dependency = gutil.parseMap(dependency, resolved, options.map);
        dependency = gutil.normalize(dependency);

        // The seajs has hacked css before 3.0.0
        // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
        // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
        if (utils.isCSSFile(dependency)) {
          dependency = utils.addExt(dependency);
        }

        // Add dependency
        deps.add(dependency);
      }

      // Return dependency
      return dependency;
    },
    {
      flags: options.js.flags,
      allowReturnOutsideFunction: true
    }
  );

  // Resolve module id
  const id = utils.resolveModuleId(vinyl, options);
  // Get contents
  const contents = id ? utils.wrapModule(id, deps, meta.code, options) : vinyl.contents;
  // Rewrite path
  const path = referer;

  return { path, dependencies, contents };
}