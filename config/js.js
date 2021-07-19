
const path = require('path')

// Rollup plugins
const alias = require('@rollup/plugin-alias')
const commonjs = require('@rollup/plugin-commonjs')
const esbuild = require('rollup-plugin-esbuild')
const externalGlobals = require('rollup-plugin-external-globals')
const inject = require('@rollup/plugin-inject')
const json = require('@rollup/plugin-json')
const polyfillNode = require('rollup-plugin-polyfill-node')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const replace = require('@rollup/plugin-replace')

function createOptionsForTaskType(config, task) {

  const {
    rootDir,
    env, // Same as process.env.NODE_ENV but allow override
    isDev
  } = config

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

  return {
    plugins: [

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

      polyfillNode(),

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
    ]
  }

}

module.exports = createOptionsForTaskType