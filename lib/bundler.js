/**
 * @module bundler
 * @license MIT
 * @version 2018/03/16
 */

import { extname } from 'path';
import * as utils from './utils';
import Bundler from '@nuintun/bundler';
import gutil from '@nuintun/gulp-util';
import * as packagers from './builtins/packagers/index';

function parse(vinyl, options) {
  const meta = packagers.js(vinyl, options);
  const contents = meta.contents;
  const dependencies = meta.dependencies;

  // Rewrite path
  vinyl.path = meta.path;

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
  const cache = options.cache;

  // Bundler
  const bundles = await new Bundler({
    input: vinyl.path,
    resolve: path => path,
    parse: async path => {
      // Hit cache
      if (cache.has(path)) {
        return cache.get(path);
      }

      // Meta
      let meta;

      // Is entry file
      if (vinyl.path === path) {
        meta = parse(vinyl, options);
      } else {
        meta = parse(await utils.loadModule(path, options), options);
      }

      // Set cache
      cache.set(path, meta);

      // Return meta
      return meta;
    }
  });

  // Combine files
  vinyl.contents = combine(bundles);

  return vinyl;
}
