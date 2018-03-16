/**
 * @module bundler
 * @license MIT
 * @version 2018/03/16
 */

import cmdDeps from 'cmd-deps';
import * as utils from './utils';
import Bundler from '@nuintun/bundler';
import through from '@nuintun/through';
import gutil from '@nuintun/gulp-util';
// import cssDeps from '@nuintun/css-deps';

/**
 * @function bundler
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl}
 */
export default async function bundler(vinyl, options) {
  const bundler = await new Bundler({
    input: vinyl.path,
    resolve: (request, referer) => {
      const root = options.root;
      const base = options.base;
      const css = /\.css$/i.test(referer);

      return utils.resolve(request, referer, css ? { root } : { root, base });
    },
    parse: path => {
      if (vinyl.path === path) {
        const parsed = cmdDeps(vinyl.contents, id => utils.parseAlias(id, options.alias), {
          flags: options.js.flags,
          word: options.js.require,
          allowReturnOutsideFunction: true
        });

        const contents = (vinyl.contents = gutil.buffer(parsed.code));
        const dependencies = parsed.dependencies.reduce((dependencies, dependency) => {
          if (dependency.flag === null) {
            dependencies.push(dependency.path);
          }

          return dependencies;
        }, []);

        return { dependencies, contents };
      } else {
        gutil.logger(path);
      }
    }
  });

  return vinyl;
}
