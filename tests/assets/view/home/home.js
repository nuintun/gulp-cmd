/**
 * @module index
 * @license MIT
 * @version 2018/01/11
 */

var $ = require('jquery');
var confirmbox = require('confirmbox');
var content = require('./dialog.tpl');

function trim() {
  // http://perfectionkills.com/whitespace-deviations/
  var whiteSpaces = [
    '\\s',

    //'0009', // 'HORIZONTAL TAB'
    //'000A', // 'LINE FEED OR NEW LINE'
    //'000B', // 'VERTICAL TAB'
    //'000C', // 'FORM FEED'
    //'000D', // 'CARRIAGE RETURN'
    //'0020', // 'SPACE'

    '00A0', // 'NO-BREAK SPACE'
    '1680', // 'OGHAM SPACE MARK'
    '180E', // 'MONGOLIAN VOWEL SEPARATOR'
    '2000-\\u200A',

    //'2000', // 'EN QUAD'
    //'2001', // 'EM QUAD'
    //'2002', // 'EN SPACE'
    //'2003', // 'EM SPACE'
    //'2004', // 'THREE-PER-EM SPACE'
    //'2005', // 'FOUR-PER-EM SPACE'
    //'2006', // 'SIX-PER-EM SPACE'
    //'2007', // 'FIGURE SPACE'
    //'2008', // 'PUNCTUATION SPACE'
    //'2009', // 'THIN SPACE'
    //'200A', // 'HAIR SPACE'

    '200B', // 'ZERO WIDTH SPACE (category Cf)
    '2028', // 'LINE SEPARATOR'
    '2029', // 'PARAGRAPH SEPARATOR'
    '202F', // 'NARROW NO-BREAK SPACE'
    '205F', // 'MEDIUM MATHEMATICAL SPACE'
    '3000' // 'IDEOGRAPHIC SPACE'
  ].join('\\u');

  var trimLeftReg = new RegExp('^[' + whiteSpaces + ']+');
  var trimRightReg = new RegExp('[' + whiteSpaces + ']+$');

  return function(string) {
    return String(string)
      .replace(trimLeftReg, '')
      .replace(trimRightReg, '');
  };
}

trim = trim();

$('#open-dialog').on('click', function() {
  confirmbox.confirm(content, '亲，你来了~', function() {
    var value = this.element.find('.ui-popup-remark').val();

    confirmbox.alert(trim(value).length ? value : '轻轻的你走了，正如你轻轻的来~');
  });
});
