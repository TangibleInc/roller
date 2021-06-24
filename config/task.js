/**
 * Create task configs
 *
 * @see https://rollupjs.org/guide/en/#rolluprollup
 * @see https://rollupjs.org/guide/en/#big-list-of-options
 */

const path = require('path')

const esbuild = require('rollup-plugin-esbuild')

const { nodeResolve } = require('@rollup/plugin-node-resolve')
const nodePolyfills = require('rollup-plugin-node-polyfills')
const commonjs = require('@rollup/plugin-commonjs')
const alias = require('@rollup/plugin-alias')

const autoprefixer = require('autoprefixer')
const postcss = require('rollup-plugin-postcss')
const del = require('rollup-plugin-delete')

// https://github.com/csstools/postcss-sass/pull/27 - https://github.com/sinankeskin/postcss-sass.git
const sass = require('@csstools/postcss-sass')


const supportedTaskTypes = ['js', 'sass']

function createTaskConfigs(config, task) {

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

  const { rootDir } = config


  // Provide list of directories for resolving modules

  const moduleDirectories = [
    ...(task.root
      ? (
        Array.isArray(task.root) ? task.root : [task.root]
      ).map(f => path.resolve(f))
      : []
    ),
    path.join(rootDir, 'node_modules')
  ]

  // Aliases: { moduleName: targetFilePath }

  const aliases = !task.alias ? {} : Object.keys(task.alias).reduce((obj, key) => {

    let target = task.alias[key]

    if (target[0]==='.') {
      target = path.join(rootDir, target)
    }

    // TODO: if no file extension, append ".js"

    obj[key] = target

    return obj
  }, {})


  // Input options

  const inputOptions = {
    input: task.src,
    preserveSymlinks: true,
    plugins: task.task==='sass'
      ? [

        // Plugins for SASS

        // Remove temporary JS file
        del({
          targets: task.dest + '.tmp',
          hook: 'closeBundle'
        }),

        // https://stackoverflow.com/questions/53653434/is-it-possible-to-use-rollup-for-processing-just-css/55481806#55481806
        postcss({
          minimize: true,
          sourceMap: true,
          extract: path.join(rootDir, task.dest ),
          plugins: [
            sass({
              includePaths: ['node_modules']
            }),
            autoprefixer
          ]
        })
      ]

      : [

        // Plugins for JavaScript

        alias({
          entries: aliases
        }),

        // https://github.com/rollup/plugins/tree/master/packages/node-resolve
        nodeResolve({
          moduleDirectories,
          browser: true,
          preferBuiltins: true
        }),

        nodePolyfills(),

        // https://github.com/egoist/rollup-plugin-esbuild
        esbuild({
          // All options are optional
          include: /\.[jt]sx?$/, // default, inferred from `loaders` option
          exclude: /node_modules/, // default
          sourceMap: true, // default: false
          minify: process.env.NODE_ENV !== 'development',
          target: 'es2017', // default, or 'es20XX', 'esnext'
          jsx: 'transform', // default, or 'preserve'
          jsxFactory: 'React.createElement',
          jsxFragment: 'React.Fragment',
          // Like @rollup/plugin-replace
          define: {
            'process': '{ "env": {} }',
          },
          tsconfig: 'tsconfig.json', // default
          // Add extra loaders
          loaders: {
            // Add .json files support
            // require @rollup/plugin-commonjs
            // '.json': 'json',
            // Enable JSX in .js files too
            '.js': 'jsx',
          },
        }),

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
  }

  return [inputOptions, outputOptions]
}

module.exports = createTaskConfigs