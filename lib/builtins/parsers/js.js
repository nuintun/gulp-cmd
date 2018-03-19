/**
 * @module js
 * @license MIT
 * @version 2018/03/19
 */

import jsDeps from 'cmd-deps';
import { extname } from 'path';
import * as utils from '../../utils';
import gutil from '@nuintun/gulp-util';

export default function jsParser(vinyl, options) {
  const root = options.root;
  const base = options.base;
  const dependencies = new Set();

  // Parse module
  const meta = jsDeps(
    vinyl.contents,
    (id, flag) => {
      id = utils.parseAlias(id, options.alias);
      id = gutil.parseMap(id, vinyl.path, options.map);
      id = gutil.normalize(id);

      // Only collect local bependency
      if (gutil.isLocal(id)) {
        // If path end with /, use index.js
        if (id.endsWith('/')) id += 'index';

        // Only collect require no flag
        if (flag === null) {
          // Add dependencies
          dependencies.add(id);
        }

        // The seajs has hacked css before 3.0.0
        // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
        // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
        if (utils.isCSSFile(id)) {
          id = utils.addExt(id);
        }
      }

      // Return id
      return id;
    },
    {
      flags: options.js.flags,
      allowReturnOutsideFunction: true
    }
  );

  // Get contents
  const contents = gutil.buffer(meta.code);
  let id = gutil.moduleId(vinyl, root, base);

  if (!/\.js$/i.test(id)) {
    id = utils.addExt(id);
  }

  return { id, dependencies, contents };
}
