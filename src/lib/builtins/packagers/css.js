/**
 * @module css
 * @license MIT
 * @version 2018/03/26
 */

import * as utils from '../../utils';
import cssDeps from '@nuintun/css-deps';
import registerLoader from '../../loaders';
import * as gutil from '@nuintun/gulp-util';

/**
 * @namespace cssPackager
 */
export default {
  /**
   * @property module
   * @type {boolean}
   */
  module: true,
  /**
   * @method resolve
   * @param {string} path
   * @returns {string}
   */
  resolve(path) {
    return utils.addExt(path);
  },
  /**
   * @method parse
   * @param {string} path
   * @param {string} contents
   * @param {Object} options
   * @returns {Object}
   */
  async parse(path, contents, options) {
    const root = options.root;
    const loader = options.css.loader;
    const { id: loaderId, path: loaderPath } = await registerLoader('css', loader, options);

    // Metadata
    const id = utils.resolveModuleId(path, options);
    const dependencies = new Set([loaderId]);
    const modules = new Set(utils.isIgnoreModule(loaderPath, options) ? [] : [loaderPath]);

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
      return onpath ? onpath(prop, value, path) : value;
    };

    // Parse module
    const meta = cssDeps(
      contents,
      (dependency, media) => {
        if (gutil.isUrl(dependency)) {
          // Relative file path from cwd
          const rpath = JSON.stringify(gutil.path2cwd(path));

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
            const rpath = JSON.stringify(gutil.path2cwd(path));

            // Output warn
            gutil.logger.warn(gutil.chalk.yellow(`Found import media queries ${media} at ${rpath}, unsupported.`), '\x07');
          }

          // Normalize
          dependency = gutil.normalize(dependency);

          // Resolve dependency
          let resolved = utils.resolve(dependency, path, { root });

          // Module can read
          if (gutil.fsSafeAccess(resolved)) {
            !utils.isIgnoreModule(resolved, options) && modules.add(resolved);
          } else {
            // Relative file path from cwd
            const rpath = JSON.stringify(gutil.path2cwd(path));

            // Output warn
            gutil.logger.warn(gutil.chalk.yellow(`Module ${JSON.stringify(dependency)} at ${rpath} can't be found.`), '\x07');
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
        }

        return false;
      },
      { onpath, media: true }
    );

    // Get contents
    contents = meta.code;

    return { id, dependencies, contents, modules };
  },
  /**
   * @method transform
   * @param {string} id
   * @param {Set} dependencies
   * @param {string} contents
   * @param {Object} options
   * @returns {string}
   */
  async transform(id, dependencies, contents, options) {
    let requires = '';
    const loader = options.css.loader;
    const { id: loaderId } = await registerLoader('css', loader, options);

    dependencies.forEach(dependency => {
      if (dependency === loaderId) {
        requires += `const loader = require(${JSON.stringify(loaderId)});\n\n`;
      } else {
        requires += `require(${JSON.stringify(dependency)});\n`;
      }

      return requires;
    });

    if (dependencies.size > 1) requires += '\n';

    contents = `${requires}loader(${JSON.stringify(contents)});`;

    return contents;
  }
};
