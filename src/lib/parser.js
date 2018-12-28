/**
 * @module parser
 * @license MIT
 * @version 2018/03/30
 */

import * as utils from './utils';
import lifecycle from './lifecycle';
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

    // Execute did load hook
    contents = await gutil.pipeline(plugins, lifecycle.moduleDidLoad, path, contents, { root, base });

    // Parse metadata
    const meta = await packager.parse(path, contents, options);

    // Override dependencies
    dependencies = meta.modules;

    // Override contents
    contents = meta.contents.toString();

    // Execute did parse hook
    contents = await gutil.pipeline(plugins, lifecycle.moduleDidParse, path, contents, { root, base });
    // Transform code
    contents = await packager.transform(meta.id, meta.dependencies, contents, options);

    // Override contents
    contents = contents.toString();

    // Resolve path
    path = await packager.resolve(path);

    // Execute did transform hook
    contents = await gutil.pipeline(plugins, lifecycle.moduleDidTransform, path, contents, { root, base });

    // If is module then wrap module
    if (packager.module) contents = utils.wrapModule(meta.id, meta.dependencies, contents, options);

    // Execute did complete hook
    contents = await gutil.pipeline(plugins, lifecycle.moduleDidComplete, path, contents, { root, base });

    // To buffer
    contents = Buffer.from(contents);
  }

  return { path, dependencies, contents };
}
