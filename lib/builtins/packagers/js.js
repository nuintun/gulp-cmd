/**
 * @module js
 * @license MIT
 * @version 2018/03/19
 */

import { extname } from 'path';
import * as utils from '../../utils';
import gutil from '@nuintun/gulp-util';

export default function jsPackager(vinyl, meta, options) {
  const referer = vinyl.path;
  const root = options.root;
  const base = options.base;

  const deps = new Set();
  const dependencies = new Set();

  meta.dependencies.forEach(dependency => {
    deps.add(utils.isCSSFile(dependency) ? utils.addExt(dependency) : dependency);

    let resolved = utils.resolve(dependency, referer, { root, base });

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

        // Output warn message
        gutil.logger.warn(gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.\x07`));
      }
    }
  });

  const contents = utils.wrapModule(meta.id, deps, meta.contents, options);

  // Rewrite path
  if (!/\.js/i.test(referer)) {
    vinyl.path = utils.addExt(referer);
  }

  return { dependencies, contents };
}
