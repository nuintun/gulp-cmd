/**
 * Created by nuintun on 2015/4/29.
 */

'use strict';

define(function (require, exports, module){
  var fork = true,
    path = require('{{path}}'),
    jquery = require('jquery');

  require.async('async');
  require.async('init', function (){});
  require.async(fork ? 'fork' : 'unfork', function (){});
});
