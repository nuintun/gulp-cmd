var $ = require('jquery');
var Template = require('template');
var compiledTemplates = {};

// 提供 Template 模板支持，默认引擎是 Template
module.exports = {
  // Template 的 helpers
  templateHelpers: null,
  // Template 的 partials
  templatePartials: null,
  // template 对应的 DOM-like object
  templateObject: null,
  // 根据配置的模板和传入的数据，构建 this.element 和 templateElement
  parseElementFromTemplate: function() {
    // template 支持 id 选择器
    var t,
      template = this.get('template');

    if (/^#/.test(template) && (t = document.getElementById(template.substring(1)))) {
      template = t.innerHTML;
      this.set('template', template);
    }

    this.templateObject = convertTemplateToObject(template);
    this.element = $(this.compile());
  },
  // 编译模板，混入数据，返回 html 结果
  compile: function(template, model) {
    template = template || this.get('template');
    model = model || this.get('model') || {};

    if (model.toJSON) {
      model = model.toJSON();
    }

    var helper, partial;
    var helpers = this.templateHelpers;
    var partials = this.templatePartials;

    // 注册 helpers
    if (helpers) {
      for (helper in helpers) {
        if (helpers.hasOwnProperty(helper)) {
          Template.helper(helper, helpers[helper]);
        }
      }
    }

    // 注册 partials
    if (partials) {
      for (partial in partials) {
        if (partials.hasOwnProperty(partial)) {
          Template.compile(partials[partial], {
            filename: partial,
            cache: false
          });
        }
      }
    }

    var compiledTemplate = compiledTemplates[template];

    if (!compiledTemplate) {
      compiledTemplate = compiledTemplates[template] = Template.compile(template, {
        filename: template,
        cache: false
      });
    }

    // 生成 html
    var html = compiledTemplate(model);

    // 卸载 helpers
    if (helpers) {
      for (helper in helpers) {
        if (helpers.hasOwnProperty(helper)) {
          delete Template.helpers[helper];
        }
      }
    }

    return html;
  },
  // 刷新 selector 指定的局部区域
  renderPartial: function(selector) {
    if (this.templateObject) {
      var template = convertObjectToTemplate(this.templateObject, selector);

      if (template) {
        if (selector) {
          this.$(selector).html(this.compile(template));
        } else {
          this.element.html(this.compile(template));
        }
      } else {
        this.element.html(this.compile());
      }
    } else {
      // 如果 template 已经编译过了，templateObject 不存在
      var all = $(this.compile());
      var selected = all.find(selector);

      if (selected.length) {
        this.$(selector).html(selected.html());
      } else {
        this.element.html(all.html());
      }
    }

    return this;
  }
};
/**
 * 将 template 字符串转换成对应的 DOM-like object
 * @param template
 * @returns {null}
 */
function convertTemplateToObject(template) {
  return isFunction(template) ? null : $(encode(template));
}

/**
 * 根据 selector 得到 DOM-like template object，并转换为 template 字符串
 * @param templateObject
 * @param selector
 * @returns {*}
 */
function convertObjectToTemplate(templateObject, selector) {
  if (!templateObject) return;

  var element;

  if (selector) {
    element = templateObject.find(selector);

    if (element.length === 0) {
      throw new Error('Invalid template selector: ' + selector);
    }
  } else {
    element = templateObject;
  }

  return decode(element.html());
}

/**
 * 转码
 * @param template
 * @returns {String}
 */
function encode(template) {
  return (
    template
      // 替换 <?= xxx ?> 为 <!--<?= xxx ?>-->
      .replace(/(<\?.+?\?>)/g, '<!--$1-->')
      // 替换 src="<?= xxx ?>" 为 data-templatable-src="<?= xxx ?>"
      .replace(/\s(src|href)\s*=\s*(['"])(.*?\<.+?)\2/g, ' data-templatable-$1=$2$3$2')
  );
}

/**
 * 解码
 * @param template
 * @returns {String}
 */
function decode(template) {
  return template
    .replace(/&lt;\?/g, '<?')
    .replace(/\?&gt;/g, '?>')
    .replace(/(?:<|&lt;)!--(<\?.+?\?>)--(?:>|&gt;)/g, '$1')
    .replace(/data-templatable-/gi, '');
}

function isFunction(obj) {
  return typeof obj === 'function';
}

// 调用 renderPartial 时，Templatable 对模板有一个约束：
// ** template 自身必须是有效的 html 代码片段**，比如
//   1. 代码闭合
//   2. 嵌套符合规范
//
// 总之，要保证在 template 里，将 `{{...}}` 转换成注释后，直接 innerHTML 插入到
// DOM 中，浏览器不会自动增加一些东西。比如：
//
// tbody 里没有 tr：
//  `<table><tbody>{{#each items}}<td>{{this}}</td>{{/each}}</tbody></table>`
//
// 标签不闭合：
//  `<div><span>{{name}}</div>`
