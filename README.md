# gulp-cmd

> A gulp plugin for cmd transport and concat
>
> [![NPM Version][npm-image]][npm-url]
> [![Download Status][download-image]][npm-url]
> [![Dependencies][david-image]][david-url]

### Usage

```js
const path = require('path');
const join = path.join;
const relative = path.relative;
const gulp = require('gulp');
const cmd = require('@nuintun/gulp-cmd');
const alias = {
  'css-loader': 'util/css-loader/1.0.0/css-loader'
};

// Fixed css resource path
function onpath(path, property, file, wwwroot) {
  if (/^[^./\\]/.test(path)) {
    path = './' + path;
  }

  if (path.indexOf('.') === 0) {
    path = join(dirname(file), path);
    path = relative(wwwroot, path);
    path = '/' + path;
    path = path.replace(/\\+/g, '/');
  }

  path = path.replace('assets/', 'online/');

  return path;
}

// Task
gulp.task('default', function() {
  gulp
    .src('assets/js/**/*.js', { base: 'assets/js' })
    .pipe(
      cmd({
        alias: alias,
        base: '/assets/js',
        ignore: ['jquery'],
        css: { onpath: onpath }
      })
    )
    .pipe(gulp.dest('online/js'));
});
```

### API

#### cmd(options)

##### _options_

- root `String`

  网站根目录配置，路径相对于 `process.cwd()` 目录。

- base `String`

  网站资源根目录配置，路径相对于 `wwwroot` 目录（相当于 `seajs` 的 `base`）， 如果不填写默认等于 `root`。

- indent `Number`

  设置代码缩进，默认值： `0`。

- strict `Boolean`

  是否启用 `JavaScript` 严格模式，默认值： `true`。

- ignore `Array`

  模块合并需要忽略的依赖模块。

- alias `Object`

  当模块标识很长时，可以使用 `alias` 来简化。

- map `Function`

  配置模块 `ID` 映射。

- onbundle `Function`

  模块合并完成后回调函数。

- combine `Boolean|Function`

  是否合并模块。

- js `Object`

  配置 `js` 转换设置参数。

- css `Object`

  配置 `css` 转换设置参数。

- packagers `Object`

  自定义模块解析规则。

- plugins `Array[Object]`

  自定义模块转换插件，有 `moduleDidLoaded, moduleDidParsed, moduleDidTransformed, moduleDidCompleted` 四个生命周期提供调用处理。

[npm-image]: http://img.shields.io/npm/v/@nuintun/gulp-cmd.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/@nuintun/gulp-cmd
[download-image]: http://img.shields.io/npm/dm/@nuintun/gulp-cmd.svg?style=flat-square
[david-image]: http://img.shields.io/david/nuintun/gulp-cmd.svg?style=flat-square
[david-url]: https://david-dm.org/nuintun/gulp-cmd
