/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

define(function (require, exports, module){
  var fork = 'pause',
    path = require('{{path}}'),
    jquery = require('jquery');

  require.async('sizzle');
  require['async']('zepto');
  require.async(['start', fork, 'stop']);
  require.async(fork ? 'fork' : 'unfork', function (){});
});
