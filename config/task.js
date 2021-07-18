/**
 * Create task configs
 *
 * @see https://rollupjs.org/guide/en/#rolluprollup
 * @see https://rollupjs.org/guide/en/#big-list-of-options
 */

const path = require('path')

// Rollup plugins
const alias = require('@rollup/plugin-alias')
const autoprefixer = require('autoprefixer')
const commonjs = require('@rollup/plugin-commonjs')
const del = require('rollup-plugin-delete')
const esbuild = require('rollup-plugin-esbuild')
const externalGlobals = require('rollup-plugin-external-globals')
const inject = require('@rollup/plugin-inject')
const json = require('@rollup/plugin-json')
const nodePolyfills = require('rollup-plugin-node-polyfills')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const replace = require('@rollup/plugin-replace')
const styles = require('rollup-plugin-styles')


const supportedTaskTypes = ['js', 'sass']
function createTaskConfigs({
  config,
  task
}) {

  if (!task.task && task.src) {

    // Determine task type from src file extension

    const extension = task.src.split('.').pop()

    if (extension==='scss') {

      task.task = 'sass'

    } else if (['js', 'jsx', 'ts', 'tsx'].indexOf(extension) >= 0) {

      task.task = 'js'
    }
  }

  if ( supportedTaskTypes.indexOf(task.task) < 0 ) {
    return
  }

  const {
    rootDir,
    env // Same as process.env.NODE_ENV but allow override
  } = config

  const isDev = env==='development'

  // Directories for resolving modules

  const moduleDirectories = [
    ...(task.root
      ? (
        Array.isArray(task.root)
          ? task.root
          : [task.root]
      ).map(f => path.resolve(f))
      : []
    ),
    path.join(rootDir, 'node_modules')
  ]


  // Aliases: { moduleName: targetFilePath }

  const aliases = task.alias
    ? Object.keys(task.alias).reduce((obj, key) => {

      let target = task.alias[key]

      // Transform relative to absolute path
      if (target[0]==='.') {
        target = path.join(rootDir, target)
      }

      obj[key] = target

      return obj
    }, {})
    : {}


  // Transform imports into global variables

  const importToGlobal = task.importToGlobal
    ? Object.assign({}, task.importToGlobal)
    : {}

  // Transform global variables into import statements

  const globalToImport = task.globalToImport
    ? Object.assign({}, task.globalToImport)
    : {}

  // Replace strings

  const replaceStrings = Object.assign({

    'process.env.NODE_ENV': JSON.stringify( env ),

    // Silence warning from plugin about default value (true) in next version
    preventAssignment: true,

  }, task.replaceStrings
    ? Object.keys(task.replaceStrings).reduce((obj, key) => {

      // Convert values to JSON string

      obj[key] = JSON.stringify( task.replaceStrings[key] )

      return obj
    }, {})
    : {}
  )


  // React

  // Mode: react, preact, wp
  let reactMode = task.react
    ? task.react.toLowerCase()
    : 'react'

  // For backward compatibility with @tangible/builder
  if (reactMode==='wp.element') reactMode = 'wp'

  // Global variable name for React
  const reactGlobal = reactMode!=='wp'
    ? 'React'
    : 'wp.element'

  // JSX transforms
  const jsxFactory  = `${reactGlobal}.createElement`
  const jsxFragment = `${reactGlobal}.Fragment`

  // Provide default aliases for Preact
  if (reactMode==='preact' && !aliases.react) {
    Object.assign(aliases, {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    })
  }

  if (reactMode==='wp') {

    // https://developer.wordpress.org/block-editor/reference-guides/packages/packages-element/

    Object.assign(importToGlobal, {
      react: 'wp.element',
      'react-dom': 'wp.element'
    })

  } else {
    globalToImport.React = ['react', '*'] // import * as React from 'react'
  }


  const destFullPath = path.join(rootDir, task.dest )

  // Input options

  const inputOptions = {
    input: task.src,
    preserveSymlinks: true,
    plugins: task.task==='sass'
      ? [

        // Plugins for SASS

        // For https://github.com/Anidetrix/rollup-plugin-styles
        styles({
          mode: 'extract',
          minimize: isDev ? false : true,

          sourceMap: true,
          // Sass loader options
          // https://anidetrix.github.io/rollup-plugin-styles/interfaces/loaders_sass.sassloaderoptions.html
          sass: {
            includePaths: ['node_modules'],
            impl: require.resolve('sass'), // Implementation: Use included Dart Sass
          },
          plugins: [autoprefixer]
        }),

        // Remove temporary JS file
        del({
          targets: task.dest + '.tmp',
          hook: 'closeBundle'
        }),
      ]

      : [

        // Plugins for JavaScript

        alias({
          entries: aliases
        }),

        replace( replaceStrings ),

        // https://github.com/rollup/plugins/tree/master/packages/node-resolve
        nodeResolve({
          moduleDirectories,
          browser: true,
          preferBuiltins: true
        }),

        nodePolyfills(),

        // https://github.com/egoist/rollup-plugin-esbuild
        esbuild({

          include: /\.[jt]sx?$/,
          exclude: /node_modules/,

          target: 'es2017', // default, or 'es20XX', 'esnext'

          sourceMap: true,
          minify: ! isDev,

          // Optionally preserve symbol names during minification
          // https://esbuild.github.io/api/#keep-names
          keepNames: task.keepNames != null ? task.keepNames : false,

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

            // CSS/SASS modules - TODO: Options for styles plugin?
            '.css': 'css',
            '.scss': 'scss',
          },
        }),

        /**
         * Transform imports into global variables
         */
        ...(Object.keys(importToGlobal).length
          ? [externalGlobals( importToGlobal )]
          : []
        ),

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
        inject( globalToImport ),

        json(),

        commonjs({
          // include: /node_modules/
        }),
      ],

    onwarn(warning, rollupWarn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return
      rollupWarn(warning)
    }
  }


  // Output options

  const outputOptions = {
    file: task.task==='sass'
      ? (task.dest + '.tmp') // PostCSS emits its own file
      : task.dest
    ,
    sourcemap: task.task==='sass' ? false : true,
    sourcemapFile: task.dest + '.map',
    format: task.task==='sass' ? 'es' : 'iife',

    // For styles plugin
    assetFileNames: task.task==='sass' ? '[name]' : '',
  }

  return {
    inputOptions,
    outputOptions
  }
}

module.exports = createTaskConfigs