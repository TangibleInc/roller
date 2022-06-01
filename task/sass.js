
const path = require('path')

// Rollup plugins
const autoprefixer = require('autoprefixer')
const del = require('rollup-plugin-delete')
const styles = require('rollup-plugin-styles')

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

  return {
    plugins: [

      // Plugins for SASS

      // For https://github.com/Anidetrix/rollup-plugin-styles
      styles({
        mode: 'extract',
        minimize: isDev ? false : true,

        sourceMap: true,
        // Sass loader options
        // https://anidetrix.github.io/rollup-plugin-styles/interfaces/loaders_sass.sassloaderoptions.html
        sass: {
          includePaths: moduleDirectories, // ['node_modules'],
          impl: require.resolve('sass'), // Implementation: Use included Dart Sass
        },
        // https://anidetrix.github.io/rollup-plugin-styles/interfaces/types.options.html
        // https://anidetrix.github.io/rollup-plugin-styles/interfaces/loaders_postcss_url.urloptions.html
        url: {
          inline: true
        },
        plugins: [autoprefixer]
      }),

      // Remove temporary JS file
      del({
        targets: task.dest + '.tmp',
        hook: 'closeBundle'
      }),
    ]
  }
}

module.exports = createOptionsForTaskType