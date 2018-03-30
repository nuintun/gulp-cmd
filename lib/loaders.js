/**
 * @module loaders
 * @license MIT
 * @version 2018/03/30
 */

import { join } from 'path';
import * as utils from './utils';
import * as gutil from '@nuintun/gulp-util';
import jsPackager from './builtins/packagers/js';

/**
 * @function registerLoader
 * @param {string} loader
 * @param {string} id
 * @param {Object} options
 * @returns {object}
 */
export default async function registerLoader(loader, id, options) {
  const loaders = options.loaders;

  // Hit cache
  if (loaders.has(loader)) return loaders.get(loader);

  // Normalize id
  id = gutil.normalize(id);

  // If id end with /, use index.js
  if (id.endsWith('/')) dependency += 'index.js';

  // Add ext
  id = utils.fileExt(id) === '.js' ? id : utils.addExt(id);

  const root = options.root;
  const base = options.base;
  const cache = options.cache;
  const plugins = options.plugins;

  // Get path
  let path = join(gutil.isAbsolute(id) ? root : base, id);

  // Resolve module id
  id = utils.resolveModuleId(path, options);

  // Dependencies
  const dependencies = new Set();
  // Get real path and stat
  const fpath = require.resolve(`./builtins/loaders/${loader}`);
  const stat = await utils.fsReadStat(fpath);

  // Read file contents
  let contents = await utils.fsReadFile(fpath);

  // Get code
  contents = contents.toString();

  // Execute load hook
  contents = await gutil.pipeline(plugins, 'load', path, contents, { root, base });
  // Execute transform hook
  contents = await gutil.pipeline(plugins, 'transform', path, contents, { root, base });
  // Transform code
  contents = await jsPackager.transform(id, dependencies, contents, options);
  // Resolve path
  path = await jsPackager.resolve(path);
  // Execute bundle hook
  contents = await gutil.pipeline(plugins, 'bundle', path, contents, { root, base });

  // To buffer
  contents = gutil.buffer(contents);

  // Create vinyl file
  const vinyl = new gutil.VinylFile({ base, path, stat, contents });

  // Set cache
  loaders.set(loader, { id, path, vinyl });
  cache.set(path, { path, dependencies, contents });

  // Return meta
  return { id, path, vinyl };
}
