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
  const loaderPath = loader.path;
  const loaderId = utils.resolveDependencyId(loader.id, loaderPath, referer);
  const deps = new Set([loaderId]);
  let requires = `var loader = require(${JSON.stringify(loaderId)});\n\n`;
  const dependencies = new Set(ignore.has(loaderPath) ? [] : [loaderPath]);

  /**
   * @function onpath
   * @param {string} value
   * @param {string} prop
   */
  const onpath = (prop, value) => {
    if (options.onpath) {
      options.onpath(prop, value, referer);
    }
  };

  const meta = cssDeps(
    vinyl.contents,
    (dependency, media) => {
      if (gutil.isLocal(dependency)) {
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

        // Resolve dependency
        let resolved = utils.resolve(dependency, referer, { root });

        // Module can read
        if (utils.fsSafeAccess(resolved)) {
          !ignore.has(resolved) && dependencies.add(resolved);
        } else {
          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(referer));

          // Output warn
          gutil.logger.warn(
            gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`),
            '\x07'
          );
        }

        // Convert absolute path to relative path
        dependency = utils.resolveDependencyId(dependency, resolved, referer);

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
        deps.add(dependency);

        requires += `require(${JSON.stringify(dependency)});\n`;
      } else {
        // Relative file path from cwd
        const rpath = JSON.stringify(gutil.path2cwd(referer));

        // Output warn
        gutil.logger.warn(
          gutil.chalk.yellow(`Found remote css file ${JSON.stringify(dependency)} at ${rpath}, unsupported.`),
          '\x07'
        );
      }

      return false;
    },
    { onpath, media: true }
  );

  if (deps.size > 1) requires += '\n';

  const id = utils.resolveModuleId(vinyl.path, options);
  const code = `${requires}loader(${JSON.stringify(meta.code)});`;
  const contents = id ? utils.wrapModule(id, deps, code, options) : vinyl.contents;
  const path = utils.addExt(referer);

  return { path, dependencies, contents };
}
