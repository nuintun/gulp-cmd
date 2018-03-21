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
 * @returns {Object}
 */
function parse(vinyl, options) {
  const ext = vinyl.extname.slice(1);
  const packager = packagers[ext.toLowerCase()];

  if (packager) {
    const meta = packager(vinyl, options);
    const dependencies = meta.dependencies;
    const contents = meta.contents;
    const path = meta.path;

    // Rewrite path
    vinyl.path = meta.path;

    return { dependencies, contents };
  }

  return {
    dependencies: new Set(),
    contents: vinyl.contents
  };
}

/**
 * @function combine
 * @param {Set} bundles
 * @returns {Buffer}
 */
function combine(bundles) {
  const contents = [];

  // Traverse bundles
  bundles.forEach(bundle => {
    contents.push(bundle.contents);
  });

  // Concat contents
  return Buffer.concat(contents);
}

/**
 * @function bundler
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Vinyl}
 */
export default async function bundler(vinyl, options) {
  const input = vinyl.path;
  const cache = options.cache;
  const cacheable = options.combine;

  // Bundler
  const bundles = await new Bundler({
    input,
    resolve: path => path,
    parse: async path => {
      // Hit cache
      if (cacheable && cache.has(path)) {
        return cache.get(path);
      }

      // Parse file
      const meta = parse(input === path ? vinyl : await utils.loadModule(path, options), options);

      // Set cache if combine is true
      if (cacheable) {
        cache.set(path, meta);
      } else {
        // If combine is false rest dependencies empty
        meta.dependencies = new Set();
      }

      // Return meta
      return meta;
    }
  });

  // console.log(bundles);

  // Combine files
  vinyl.contents = combine(bundles);

  return vinyl;
}
