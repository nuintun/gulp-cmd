gulp-cmd
=========

>A gulp plugin for cmd transport and concat

>[![Dependencies][david-image]][david-url]

[david-image]: http://img.shields.io/david/nuintun/gulp-cmd.svg?style=flat-square
[david-url]: https://david-dm.org/nuintun/gulp-cmd

###Usage
```js
var path = require('path');
var join = path.join;
var relative = path.relative;
var gulp = require('gulp');
var cmd = require('gulp-cmd');
var alias = {
  'import-style': 'util/import-style/1.0.0/import-style'
};

// Fixed css resource path
function onpath(path, property, file, wwwroot){
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
gulp.task('default', function (){
  gulp.src('assets/js/**/*.js', { base: 'assets/js' })
    .pipe(cmd({
      alias: alias,
      ignore: ['jquery'],
      include: function (id){
        return id.indexOf('view') === 0 ? 'all' : 'self';
      },
      css: { onpath: onpath }
    }))
    .pipe(gulp.dest('online/js'));
});
```

###API
####cmd(options)
#####  *options*
- map ```Array```
  
  配置模块ID路径映射修改，可用于路径转换。
  
- vars ```Object```
  
  模块路径在运行时才能确定，这时可以使用 vars 变量来配置。

- paths ```Object```
  
  当目录比较深，或需要跨目录调用模块时，可以使用 paths 来简化书写。

- alias ```Object```
  
  当模块标识很长时，可以使用 alias 来简化。
>注意：*[import-style](https://github.com/nuintun/import-style) 为内置样式加载模块，建议配置 alias 以便正确的转换该模块，该模块需要自己下载并放入相应目录。 vars paths alias 可参考 [seajs](https://github.com/seajs/seajs/issues/262) 的配置*

- cache ```Boolean```
  
  文件内存缓存，转换完成的文件会暂时存储在内存中以便提升转换效率。

- wwwroot ```String```
  
  网站根目录配置，路径相对于 ```gulpfile.js``` 目录。

- idleading ```String|Function```
  
  模块 id 转换模板，默认 ```{{name}}/{{version}}/{{file}}```， 三个变量由 vinyl 文件的 relative 属性转换而来，所以 gulp.src 的 [base](https://github.com/wearefractal/vinyl) 参数必须设置，base 等同于 seajs 的 [base](https://github.com/seajs/seajs/issues/262) 配置。

- rename ```Object|Function```
  
  重命名文件，有 ```debug``` 和 ```min``` 两个配置可选，打开后文件名会自动添加 -debug 和 -min 后缀，debug 打开时 min 配置无效。当 rename 是函数的时候要返回 ```{ prefix: '', suffix: '' }``` 格式的对象，分别对应前缀和后缀。

- plugins ```Object```
  
  文件转换插件，可以覆写默认插件，也可定义新插件，匹配的 ```vinyl``` 文件会经过插件的转换函数，插件名字必须为不包含 ```.``` 文件扩展名。

- include ```String```
  
  模块封装模式，默认 ```relative```，可选 ```all``` 和 ```self```。分别对应：（1）合并相对依赖文件。（2）合并所有依赖文件。（3）不合并任何文件。

- css ```Object```
  
  转换 css 到 js 的配置，有 ```onpath``` 和 ```prefix``` 两个配置可选，配置类型为 ```String|Function```，对应 css 文件的资源文件路径处理和类名前缀。

- ignore ```Array```
  
  模块合并需要忽略的依赖模块，支持路径和 vars paths alias 配置，不支持相对路径（默认忽略），以 ```/``` 开头的路径按照 wwwroot 寻找， 其他按照 base 寻找。

>注意事项：*模块 id 以 ```/``` 结尾会默认用 ```index.js``` 或者 ```index.css``` 补全*， id 以 ```/``` 开头的模块会从 wwwroot 路径寻找。id 规则简化，所有 id 都会自动补全 js 后缀，和 seajs 的[模块标识](https://github.com/seajs/seajs/issues/258)中的 *文件后缀的自动添加规则* 有点区别，但不会破坏 seajs 的规则，只是相应模块不会做处理和合并。css 的 import 规则和原生一致，需要注意的是尽量不要引入远程资源。
