/**
 * @module rollup
 * @license MIT
 * @version 2018/03/26
 */

'use strict';

const fs = require('fs-extra');
const rollup = require('rollup');
const pkg = require('./package.json');

/**
 * @function build
 * @param {Object} inputOptions
 * @param {Object} outputOptions
 */
async function build(inputOptions, outputOptions) {
  await fs.remove('dist');

  const bundle = await rollup.rollup(inputOptions);

  await bundle.write(outputOptions);
  console.log(`Build ${outputOptions.file} success!`);
  await fs.copy('lib/builtins/loaders', 'dist/builtins/loaders');
  console.log(`Build dist/builtins/loaders success!`);
}

const banner = `/**
 * @module ${pkg.name}
 * @author ${pkg.author.name}
 * @license ${pkg.license}
 * @version ${pkg.version}
 * @description ${pkg.description}
 * @see ${pkg.homepage}
 */
`;

const inputOptions = {
  input: 'index.js',
  preferConst: true,
  external: [
    'fs',
    'util',
    'path',
    'cmd-deps',
    '@nuintun/bundler',
    '@nuintun/through',
    '@nuintun/css-deps',
    '@nuintun/gulp-util'
  ]
};

const outputOptions = {
  banner,
  format: 'cjs',
  strict: true,
  indent: true,
  legacy: true,
  interop: false,
  file: 'dist/index.js'
};

build(inputOptions, outputOptions);
