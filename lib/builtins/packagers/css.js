/**
 * @module css
 * @license MIT
 * @version 2018/03/26
 */

import * as utils from '../../utils';
import cssDeps from '@nuintun/css-deps';
import * as gutil from '@nuintun/gulp-util';

/**
 * @function cssPackager
 * @param {Vinyl} vinyl
 * @param {Object} options
 * @returns {Object}
 */
export default async function cssPackager(vinyl, options) {
  const root = options.root;
  const referer = vinyl.path;
  const ignore = options.ignore;
  const loader = await utils.registerLoader('css', options.css.loader, options);
  const loaderId = loader.id;
  const loaderPath = loader.path;
  const dependencies = new Set([loaderId]);
  let requires = `const loader = require(${JSON.stringify(loaderId)});\n\n`;
  const modules = new Set(ignore.has(loaderPath) ? [] : [loaderPath]);

  /**
   * @function onpath
   * @param {string} prop
   * @param {string} value
   */
  const onpath = (prop, value) => {
    // Normalize value
    value = gutil.isUrl(value) ? value : gutil.normalize(value);

    // Get onpath
    const onpath = options.css.onpath;

    // Returned value
    return onpath ? onpath(prop, value, referer) : value;
  };

  // Parse module
  const meta = cssDeps(
    vinyl.contents,
    (dependency, media) => {
      if (gutil.isUrl(dependency)) {
        // Relative file path from cwd
        const rpath = JSON.stringify(gutil.path2cwd(referer));

        // Output warn
        gutil.logger.warn(
          gutil.chalk.yellow(`Found remote css file ${JSON.stringify(dependency)} at ${rpath}, unsupported.`),
          '\x07'
        );
      } else {
        if (media.length) {
          // Get media
          media = JSON.stringify(media.join(', '));

          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(referer));

          // Output warn
          gutil.logger.warn(
            gutil.chalk.yellow(`Found import media queries ${media} at ${rpath}, unsupported.`),
            '\x07'
          );
        }

        // Normalize
        dependency = gutil.normalize(dependency);

        // Resolve dependency
        let resolved = utils.resolve(dependency, referer, { root });

        // Module can read
        if (utils.fsSafeAccess(resolved)) {
          !ignore.has(resolved) && modules.add(resolved);
        } else {
          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(referer));

          // Output warn
          gutil.logger.warn(
            gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`),
            '\x07'
          );
        }

        // Use css resolve rule
        if (!gutil.isRelative(dependency)) dependency = `./${dependency}`;

        // Parse map
        dependency = gutil.parseMap(dependency, resolved, options.map);
        dependency = gutil.normalize(dependency);
        // The seajs has hacked css before 3.0.0
        // https://github.com/seajs/seajs/blob/2.2.1/src/util-path.js#L49
        // Demo https://github.com/popomore/seajs-test/tree/master/css-deps
        dependency = utils.addExt(dependency);

        // Add dependency
        dependencies.add(dependency);

        requires += `require(${JSON.stringify(dependency)});\n`;
      }

      return false;
    },
    { onpath, media: true }
  );

  if (dependencies.size > 1) requires += '\n';

  const path = utils.addExt(referer);
  const id = utils.resolveModuleId(referer, options);
  const contents = `${requires}loader(${JSON.stringify(meta.code)});`;

  return { id, path, dependencies, contents, modules };
}
