/**
 * @module bundler
 * @license MIT
 * @version 2018/03/16
 */

import * as utils from './utils';
import Bundler from '@nuintun/bundler';
import * as packagers from './builtins/packagers/index';

/**
 * @function parse
 * @param {Vinyl} vinyl
 * @param {Object} options
 */
function parse(vinyl, options) {
  const ext = vinyl.extname.slice(1);
  const packager = packagers[ext.toLowerCase()];

  if (!packager) {
    return { dependencies: new Set(), contents: vinyl.contents };
  }

  const meta = packager(vinyl, options);
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

      if (!options.combine) {
        meta.dependencies = new Set();
      }

      // Return meta
      return meta;
    }
  });

  // Combine files
  vinyl.contents = combine(bundles);

  return vinyl;
}