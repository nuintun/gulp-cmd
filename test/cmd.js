/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

define(function (require, exports, module){
  var fork = 'pause',
    path = require('{{path}}'),
    jquery = require('jquery');

  require.async('asyc');
  require['async']('async');
  require.async(['start', 'stop']);
  require.async([fork, 'start', 'stop']);
  require.async(['start', 'stop'], function (init){});
  require.async(fork ? 'fork' : 'unfork', function (){});
});
