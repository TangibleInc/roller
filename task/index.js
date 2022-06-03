/**
 * Create task configs
 *
 * @see https://rollupjs.org/guide/en/#rolluprollup
 * @see https://rollupjs.org/guide/en/#big-list-of-options
 */

const path = require('path')

const supportedTaskTypes = ['js', 'sass', 'html', 'copy', 'custom']

function createTaskConfigs({ config, task }) {
  if (supportedTaskTypes.indexOf(task.task) < 0) {
    return
  }

  const {
    rootDir,
    env, // Same as process.env.NODE_ENV but allow override
    isDev,
  } = config

  const createOptionsForTaskType = require(`./${task.task}`)

  if (!task.src || !task.dest)
    return {
      inputOptions: createOptionsForTaskType(config, task),
      outputOptions: {},
    }

  const destFullPath = path.join(rootDir, task.dest)

  // Input options

  const inputOptions = {
    input: task.src,
    preserveSymlinks: true,

    ...createOptionsForTaskType(config, task),

    onwarn(warning, rollupWarn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return
      rollupWarn(warning)
    },
  }

  // Output options

  const outputOptions = {
    // name: task.name,
    file:
      task.task === 'sass'
        ? task.dest + '.tmp' // PostCSS emits its own file
        : task.dest,
    sourcemap: task.task === 'sass' ? false : true,
    sourcemapFile: task.dest + '.map',
    format: task.task === 'sass' ? 'es' : 'iife',

    // For styles plugin
    assetFileNames: task.task === 'sass' ? '[name]' : '',
  }

  return {
    inputOptions,
    outputOptions,
  }
}

module.exports = createTaskConfigs