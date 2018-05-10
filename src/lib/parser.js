/**
 * @module parser
 * @license MIT
 * @version 2018/03/30
 */

import * as utils from './utils';
import * as gutil from '@nuintun/gulp-util';
import * as packagers from './builtins/packagers/index';

/**
 * @function parser
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
export default async function parser(vinyl, options) {
  let path = vinyl.path;
  let dependencies = new Set();
  let contents = vinyl.contents;

  const ext = vinyl.extname.slice(1).toLowerCase();
  const packager = options.packagers[ext] || packagers[ext];

  if (packager) {
    const root = options.root;
    const base = options.base;
    const plugins = options.plugins;

    // Get code
    contents = contents.toString();

    // Execute loaded hook
    contents = await gutil.pipeline(plugins, 'load', path, contents, { root, base });

    // Parse metadata
    const meta = await packager.parse(path, contents, options);

    // Override contents
    contents = meta.contents;

    // Execute parsed hook
    contents = await gutil.pipeline(plugins, 'transform', path, contents, { root, base });
    // Transform code
    contents = await packager.transform(meta.id, meta.dependencies, contents, options);

    // If is module then wrap module
    if (packager.module) contents = utils.wrapModule(meta.id, meta.dependencies, contents, options);

    // Resolve path
    path = await packager.resolve(path);
    // Execute transformed hook
    contents = await gutil.pipeline(plugins, 'bundle', path, contents, { root, base });

    // Override dependencies
    dependencies = meta.modules;

    // To buffer
    contents = Buffer.from(contents);
  }

  return { path, dependencies, contents };
}
