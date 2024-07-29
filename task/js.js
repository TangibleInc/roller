const path = require('path')

// Rollup plugins
const alias = require('@rollup/plugin-alias')
const commonjs = require('@rollup/plugin-commonjs')
const esbuild = require('rollup-plugin-esbuild').default
const externalGlobals = require('rollup-plugin-external-globals')
const image = require('@rollup/plugin-image')
const inject = require('@rollup/plugin-inject')
const json = require('@rollup/plugin-json')
const polyfillNode = require('rollup-plugin-polyfill-node')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const replace = require('@rollup/plugin-replace')
const injectProcessEnv = require('rollup-plugin-inject-process-env')
/**
 * Using fork of rollup-plugin-styles with updated dependencies
 * See [Support for Rollup v3](https://github.com/Anidetrix/rollup-plugin-styles/issues/224)
 */
const styles = require('@ironkinoko/rollup-plugin-styles')
const kebabToCamel = require('../utils/kebabToCamel')
const raw = require('../utils/rollupPluginRaw')

function createOptionsForTaskType(config, task) {
  const {
    rootDir,
    env, // Same as process.env.NODE_ENV but allow override
    isDev,
  } = config

  // Directories for resolving modules

  const modulePaths = [
    ...(task.root
      ? (Array.isArray(task.root) ? task.root : [task.root]).map((f) =>
          path.resolve(f)
        )
      : []),
    path.join(rootDir, 'node_modules'),
  ]

  // Transform imports into global variables

  const importToGlobal = task.importToGlobal
    ? Object.assign({}, task.importToGlobal)
    : {}

  // Aliases: { moduleName: targetFilePath }

  const aliases = task.alias
    ? Object.keys(task.alias).reduce((obj, key) => {
        let target = task.alias[key]

        // Shortcut to alias import to global variable
        if (target.indexOf('window.') === 0) {
          importToGlobal[key] = target.replace('window.', '')
          return obj
        }

        // Transform relative to absolute path
        if (target[0] === '.') {
          target = path.join(rootDir, target)
        }

        obj[key] = target

        return obj
      }, {})
    : {}

  // Transform global variables into import statements

  const globalToImport = task.globalToImport
    ? Object.assign({}, task.globalToImport)
    : {}

  // Replace strings

  const processEnv = {
    NODE_ENV: env,
  }
  const values = {}

  if (task.replaceStrings) {
    for (const key of Object.keys(task.replaceStrings)) {
      if (key === 'process.env') {
        Object.assign(processEnv, task.replaceStrings[key])
        continue
      }
      values[key] =
        task.replaceStrings[key] instanceof Function
          ? () => JSON.stringify(task.replaceStrings[key]())
          : JSON.stringify(task.replaceStrings[key])
    }
  }

  const replaceStrings = {
    // Silence warning from plugin about default value (true) in next version
    preventAssignment: true,
    values,
  }

  // React

  // Mode: react, preact, wp
  let reactMode = task.react || 'react'

  if (reactMode.indexOf('window.') === 0) {
    importToGlobal.react = reactMode.replace('window.', '')
    reactMode = 'react'
  } else {
    reactMode = reactMode.toLowerCase()
  }

  // For backward compatibility with @tangible/builder
  if (reactMode === 'wp.element') reactMode = 'wp'

  // Global variable name for React
  const reactGlobal = importToGlobal.react
    ? importToGlobal.react
    : reactMode !== 'wp'
      ? 'React'
      : 'wp.element'

  // JSX transforms
  const jsxFactory = `${reactGlobal}.createElement`
  const jsxFragment = `${reactGlobal}.Fragment`

  // Provide default aliases for Preact
  if (reactMode === 'preact' && !aliases.react) {
    Object.assign(aliases, {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    })
  }

  if (reactMode === 'wp') {
    // https://developer.wordpress.org/block-editor/reference-guides/packages/packages-element/

    Object.assign(importToGlobal, {
      react: 'wp.element',
      'react-dom': 'wp.element',
    })

    /**
     * By default, alias import `@wordpress/*` to properties under global
     * variable `wp`, the same as the `wp-scripts` tool.
     * @see https://github.com/WordPress/gutenberg/blob/30e1054c8be9b25ad6723dfc2fd2498c567e574d/packages/dependency-extraction-webpack-plugin/lib/util.js#L15
     */

    // Escape hatch
    if (importToGlobal['@wordpress'] === false) {
      delete importToGlobal['@wordpress']
    } else {
      importToGlobal['@wordpress/*'] = 'wp.*'
    }
  } else if (importToGlobal.react) {
    /**
     * Replace import 'react' with global variable
     * Ensure react-dom is aliased to the same, unless specified
     */
    if (!importToGlobal['react-dom']) {
      importToGlobal['react-dom'] = importToGlobal.react
    }
  } else {
    // import * as React from 'react'
    globalToImport.React = ['react', '*']
  }

  /**
   * Bundle dynamic imports inline by default, unless using ES Module format
   * and dynamic export file names are defined to support code splitting.
   *
   * For example: { format: 'es', assetFileNames: 'build/prefix-[name].[ext]' }
   *
   * @see https://bitbucket.org/tangibleinc/roller/issues/2/invalid-value-iife-for-option-outputformat
   * @see https://rollupjs.org/configuration-options/#output-assetfilenames
   */
  if (!task.output) task.output = {}
  if (
    !task.output.format &&
    typeof task.output.inlineDynamicImports === 'undefined'
  ) {
    task.output.inlineDynamicImports = true
  }

  const isEsModule = task.type === 'module'

  // Rollup input options
  return {
    plugins: [
      // Plugins for JavaScript

      ...(isEsModule
        ? []
        : [
            /**
             * CommonJS plugin moved from below ESBuild to top of list,
             * to better handle module and exports. It also means JSX is
             * only supported in files with .jsx or .tsx file extension.
             */
            commonjs({
              preserveSymlinks: true,

              // https://github.com/rollup/plugins/tree/master/packages/commonjs#transformmixedesmodules
              transformMixedEsModules: true,
            }),
          ]),

      /**
       * Support styles import from JS
       * https://github.com/Anidetrix/rollup-plugin-styles
       * https://anidetrix.github.io/rollup-plugin-styles/interfaces/types.Options.html
       */
      styles({
        // Enable CSS modules for file extension .module.css
        autoModules: true,
        extensions: ['css', 'scss'],
        mode: 'extract',
        sourceMap: true,
        minimize: true,
        ...(task.styles || {}),
      }),

      json(),

      /**
       * A Rollup plugin which imports JPG, PNG, GIF, SVG, and WebP files.
       *
       * "Images are encoded using base64, which means they will be 33% larger than
       * the size on disk. You should therefore only use this for small images where
       * the convenience of having them available on startup (e.g. rendering immediately
       * to a canvas without co-ordinating asynchronous loading of several images)
       * outweighs the cost."
       * @see https://github.com/rollup/plugins/tree/master/packages/image
       */
      image(),

      alias({
        entries: aliases,
        // https://github.com/rollup/plugins/tree/master/packages/alias#custom-resolvers
        customResolver: nodeResolve({
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        }),
      }),

      injectProcessEnv(processEnv),

      replace(replaceStrings),

      // https://github.com/rollup/plugins/tree/master/packages/node-resolve
      nodeResolve({
        modulePaths,
        browser: true,
        // Following option must be *false* for polyfill to work
        preferBuiltins: false,
      }),

      // https://github.com/FredKSchott/rollup-plugin-polyfill-node
      polyfillNode({
        // include: null, // Transform Node.js builtins in all files
        sourceMap: true,
      }),

      // https://github.com/egoist/rollup-plugin-esbuild
      esbuild({
        include: /\.[jt]sx?$/,
        exclude: /node_modules/,

        target: 'es2020', // default, or 'es20XX', 'esnext'

        sourceMap: true,
        minify: !isDev && !isEsModule,

        // Optionally preserve symbol names during minification
        // https://esbuild.github.io/api/#keep-names
        keepNames: true,

        jsx: 'transform',
        jsxFactory,
        jsxFragment,

        tsconfig: 'tsconfig.json', // default

        // Add extra loaders
        loaders: {
          // Enable JSX in .js files
          '.js': 'jsx',

          // Add .json files support - require @rollup/plugin-json
          '.json': 'json',

          // CSS/SASS modules
          '.css': 'css',
          '.scss': 'scss',

          // Other content types - https://esbuild.github.io/content-types/
          '.svg': 'text',

          ...(task.esbuildLoaders || {}),
        },

        // Custom ESBuild options per task
        ...(task.esbuild || {}),
      }),

      // Raw plugin must be before externalGlobals
      ...(task.raw ? [raw(task.raw)] : []),

      /**
       * Transform imports into global variables
       *
       * Previously used a simple `externalGlobals(importToGlobal)`, but it only
       * supports `import` statements.
       *
       * For `require` statements, usually inside NPM packages in node_modules,
       * the CommonJS plugin transforms module names into absolute paths. To
       * support this, it's necessary to use a function to dynamically match
       * the module path. [0] In addition, the module may be wrapped to provide
       * `__require` and `default` properties. [1]
       *
       * This workaround depends on the internals of the CommonJS plugin.
       * Ideally, the issue should be solved in the plugin itself.
       *
       * The real underlying issue is that the External Globals plugin does not
       * work well with the CommonJS plugin. And also Rollup's option `globals`
       * is not working as expected. [2]
       *
       * [0] https://github.com/eight04/rollup-plugin-external-globals#createplugin
       * [1] https://github.com/rollup/plugins/blob/master/packages/commonjs/src/generate-imports.js
       * [2] https://rollupjs.org/guide/en/#outputglobals
       */
      ...(Object.keys(importToGlobal).length
        ? [
            externalGlobals((id) => {
              for (const key of Object.keys(importToGlobal)) {
                // Name of global variable, such as `wp.element`
                const varName = importToGlobal[key]

                if (id === key) return varName

                // Match wildcard
                if (key.endsWith('/*')) {
                  const keyBase = key.slice(0, -1)
                  if (id.indexOf(keyBase) !== 0) continue
                  if (varName instanceof Function) {
                    return varName(id)
                  }
                  if (varName.endsWith('.*')) {
                    const slug = id.slice(keyBase.length)
                    return varName.slice(0, -1) + kebabToCamel(slug)
                  }
                  return varName
                }

                // Strangely, ID can have null character at beginning
                id = id.replace(/^\0/, '')

                if (
                  id.indexOf(`/node_modules/${key}/`) < 0 &&
                  id !== `${key}?commonjs-external`
                )
                  continue

                // Provide missing property "default"
                const fn = `function() {
                  if (${varName} && !${varName}.default) ${varName}.default = ${varName};
                  if (${varName} && !${varName}.__module) ${varName}.__module = { exports: ${varName}, default: ${varName} };
                  if (${varName} && '${varName}' === 'wp.element' && !${varName}.jsx) ${varName}.jsx = ${varName}.createElement;
                  return ${varName};
                }`

                const type = id.split('?')[1]

                if (type === 'commonjs-wrapped') {
                  return `{ __require: ${fn} }`
                }
                if (type === 'commonjs-external' || type === 'commonjs-proxy') {
                  return `(${fn})()`
                }
                if(type === 'commonjs-module') {
                  return `(${fn})()`
                }

                return varName
              }
            }),
          ]
        : []),

      /**
       * Transform global variables into import statements
       *
       * For React, it serves as an auto-import when JSX is used.
       *
       * - The plugin can't parse JSX, so it must come after esbuild.
       * - If target import has an alias, such as for Preact, it is
       * correctly transformed.
       *
       * @see https://github.com/rollup/plugins/tree/master/packages/inject
       */
      inject(globalToImport),

      // Custom Rollup plugins per task
      ...(task.rollupPlugins || []),
    ],
  }
}

module.exports = createOptionsForTaskType
