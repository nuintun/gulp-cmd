/**
 * @module bundler
 * @license MIT
 * @version 2018/03/16
 */

import fs from 'fs';
import { extname } from 'path';
import cmdDeps from 'cmd-deps';
import * as utils from './utils';
import Bundler from '@nuintun/bundler';
import through from '@nuintun/through';
import gutil from '@nuintun/gulp-util';
// import cssDeps from '@nuintun/css-deps';

function parse(vinyl, options) {
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
}

/**
 * @function combine
 * @param {Set} bundles
 * @returns {Buffer}
 */
function combine(bundles) {
  const files = [];

  bundles.forEach(bundle => {
    files.push(bundle.contents);
  });

  return Buffer.concat(files);
}

/**
 * @function bundler
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl}
 */
export default async function bundler(vinyl, options) {
  let bundles;

  // Read from cache
  if (options.cache.has(vinyl.path)) {
    bundles = options.cache.get(vinyl.path);
  } else {
    // Bundler
    bundles = await new Bundler({
      input: vinyl.path,
      resolve: (request, referer) => {
        const root = options.root;
        const base = options.base;
        const css = /\.css$/i.test(referer);

        // If path end with /, use index.js
        if (!css && request.endsWith('/')) request += 'index.js';

        // Add extname
        if (!extname(request)) {
          request = utils.addExt(request);
        }

        // Resolve
        request = utils.resolve(request, referer, css ? { root } : { root, base });

        return request;
      },
      parse: async path => {
        // Is entry file
        if (vinyl.path === path) {
          return parse(vinyl, options);
        } else {
          try {
            return parse(await utils.loadModule(path, options), options);
          } catch (error) {
            gutil.logger.error(error);

            return { dependencies: [], contents: gutil.buffer('') };
          }
        }
      }
    });

    // Add cache
    options.cache.set(vinyl.path, bundles);
  }

  // Combine files
  vinyl.contents = combine(bundles);

  return vinyl;
}
