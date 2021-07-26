const cwd = process.cwd();

export default {
  title: 'gulp-css',
  description: 'A gulp plugin for cmd transport and concat.',
  type: 'object',
  properties: {
    root: {
      type: 'string',
      default: cwd
    },
    base: {
      type: 'string',
      default: ''
    },
    indent: {
      type: 'integer',
      default: 2
    },
    strict: {
      type: 'boolean',
      default: true
    },
    ignore: {
      type: 'array',
      items: {
        type: 'string'
      },
      default: []
    },
    alias: {
      type: 'object',
      default: {}
    },
    map: {
      instanceof: 'Function'
    },
    onbundle: {
      instanceof: 'Function'
    },
    combine: {
      oneOf: [
        {
          type: 'boolean'
        },
        {
          instanceof: 'Function'
        }
      ],
      default: false,
      errorMessage: 'should be boolean or function'
    },
    js: {
      type: 'object',
      properties: {
        flags: {
          type: 'array',
          items: {
            type: 'string'
          },
          default: ['async']
        }
      },
      default: {}
    },
    css: {
      type: 'object',
      properties: {
        loader: {
          type: 'string',
          default: 'css-loader'
        },
        onpath: {
          instanceof: 'Function'
        }
      },
      default: {}
    },
    packagers: {
      type: 'object',
      patternProperties: {
        '^.*$': {
          type: 'object',
          properties: {
            module: {
              type: 'boolean'
            },
            resolve: {
              instanceof: 'Function',
              errorMessage: 'should be function'
            },
            parse: {
              instanceof: 'Function',
              errorMessage: 'should be function'
            },
            transform: {
              instanceof: 'Function',
              errorMessage: 'should be function'
            }
          },
          required: ['resolve', 'parse', 'transform']
        }
      },
      default: {}
    },
    plugins: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          moduleDidLoaded: {
            instanceof: 'Function',
            errorMessage: 'should be function'
          },
          moduleDidParsed: {
            instanceof: 'Function',
            errorMessage: 'should be function'
          },
          moduleDidTransformed: {
            instanceof: 'Function',
            errorMessage: 'should be function'
          },
          moduleDidCompleted: {
            instanceof: 'Function',
            errorMessage: 'should be function'
          }
        }
      },
      default: []
    }
  },
  required: ['base'],
  additionalProperties: false
};
