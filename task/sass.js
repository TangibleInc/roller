import path from 'path'

// Rollup plugins
import autoprefixer from 'autoprefixer'
import del from 'rollup-plugin-delete'
/**
 * Using fork of rollup-plugin-styles with updated dependencies
 * See [Support for Rollup v3](https://github.com/Anidetrix/rollup-plugin-styles/issues/224)
 */
import styles from 'rollup-plugin-styler'

export default async function createOptionsForTaskType(config, task) {
  const {
    rootDir,
    env, // Same as process.env.NODE_ENV but allow override
    isDev,
  } = config

  // Directories for resolving modules

  const moduleDirectories = [
    ...(task.root
      ? (Array.isArray(task.root) ? task.root : [task.root]).map((f) =>
          path.resolve(f)
        )
      : []),
    path.join(rootDir, 'node_modules'),
  ]

  return {
    plugins: [
      // Plugins for SASS

      // For https://github.com/Anidetrix/rollup-plugin-styles
      styles({
        mode: 'extract',
        minimize: isDev ? false : true,

        sourceMap: task.map !== false, // true by default
        // Sass loader options
        // https://anidetrix.github.io/rollup-plugin-styles/interfaces/loaders_sass.sassloaderoptions.html
        sass: {
          includePaths: moduleDirectories, // ['node_modules'],
          impl: 'sass', // import.meta.resolve('sass'),
            // require.resolve('sass'), // Implementation: Use included Dart Sass
        },
        // https://anidetrix.github.io/rollup-plugin-styles/interfaces/types.options.html
        // https://anidetrix.github.io/rollup-plugin-styles/interfaces/loaders_postcss_url.urloptions.html
        url: {
          inline: true,
        },
        plugins: [
          ...(task.postCssPlugins || []),
          autoprefixer,
        ],
      }),

      // Remove temporary JS file
      del({
        targets: task.dest + '.tmp',
        hook: 'closeBundle',
      }),
    ],
  }
}
