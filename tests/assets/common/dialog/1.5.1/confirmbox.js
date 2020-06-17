var $ = require('jquery');
var Dialog = require('./dialog');
var template = require('./confirmbox.tpl');

// ConfirmBox
// -------
// ConfirmBox 是一个有基础模板和样式的对话框组件。
var ConfirmBox = Dialog.extend({
  attrs: {
    title: '默认标题',

    confirmTpl: '<a class="ui-dialog-button-orange" href="javascript:;">确定</a>',

    cancelTpl: '<a class="ui-dialog-button-white" href="javascript:;">取消</a>',

    message: '默认内容'
  },
  setup: function () {
    ConfirmBox.superclass.setup.call(this);

    var model = {
      classPrefix: this.get('classPrefix'),
      message: this.get('message'),
      title: this.get('title'),
      confirmTpl: this.get('confirmTpl'),
      cancelTpl: this.get('cancelTpl'),
      hasFoot: this.get('confirmTpl') || this.get('cancelTpl')
    };
    this.set('content', this.compile(template, model));
  },
  events: {
    'click [data-role=confirm]': function (e) {
      e.preventDefault();
      this.trigger('confirm');
    },
    'click [data-role=cancel]': function (e) {
      e.preventDefault();
      this.trigger('cancel');
      this.hide();
    }
  },
  _onChangeMessage: function (val) {
    this.$('[data-role=message]').html(val);
  },
  _onChangeTitle: function (val) {
    this.$('[data-role=title]').html(val);
  },
  _onChangeConfirmTpl: function (val) {
    this.$('[data-role=confirm]').html(val);
  },
  _onChangeCancelTpl: function (val) {
    this.$('[data-role=cancel]').html(val);
  }
});

ConfirmBox.alert = function (message, callback, options) {
  var defaults = {
    message: message,
    title: '提示',
    cancelTpl: '',
    closeTpl: '',
    onConfirm: function () {
      callback && callback.apply(this, arguments);
      this.hide();
    }
  };
  new ConfirmBox($.extend(null, defaults, options)).show().after('hide', function () {
    this.destroy();
  });
};

ConfirmBox.confirm = function (message, title, onConfirm, onCancel, options) {
  // support confirm(message, title, onConfirm, options)
  if (typeof onCancel === 'object' && !options) {
    options = onCancel;
    onCancel = undefined;
  }

  var defaults = {
    message: message,
    title: title || '确认框',
    closeTpl: '',
    onConfirm: function () {
      if ($.isFunction(onConfirm) && onConfirm.apply(this, arguments) !== false) {
        this.hide();
      }
    },
    onCancel: function () {
      $.isFunction(onCancel) && onCancel.apply(this, arguments);
      this.hide();
    }
  };

  new ConfirmBox($.extend(null, defaults, options)).show().after('hide', function () {
    this.destroy();
  });
};

ConfirmBox.show = function (message, callback, options) {
  var defaults = {
    message: message,
    title: '',
    confirmTpl: false,
    cancelTpl: false
  };

  new ConfirmBox($.extend(null, defaults, options))
    .show()
    .before('hide', function () {
      callback && callback.apply(this, arguments);
    })
    .after('hide', function () {
      this.destroy();
    });
};

module.exports = ConfirmBox;
