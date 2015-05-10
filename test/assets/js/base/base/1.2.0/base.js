// Base
// ---------
// Base 是一个基础类，提供 Class、Events、Attrs 和 Aspect 支持。

require('./class');
require('./base.css');
require('./base.tpl');
require('./base.html');
require('./base.json');

module.exports = function (){
  console.log('base module');
};