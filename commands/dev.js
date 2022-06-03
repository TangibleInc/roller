/**
 * Build for development and watch files for changes
 *
 * @see https://rollupjs.org/guide/en/#rollupwatch
 */

const path = require('path')
const rollup = require('rollup')
const onExit = require('../utils/onExit')
const displayError = require('../utils/displayError')

async function dev(props) {
  const { config, task, inputOptions, outputOptions, reloader } = props

  // Custom build task
  if (inputOptions.build) {
    return await inputOptions.build(props)
  }

  const { rootDir } = config

  return await new Promise((resolve, reject) => {
    const watcher = rollup.watch({
      ...inputOptions,
      output: [outputOptions],
      watch: {
        exclude: /node_modules/,
      },
    })

    onExit(function () {
      watcher.close()
    })

    let firstTime = true

    watcher.on('event', (e) => {
      const { code, result, input, output, duration, error } = e

      // This will make sure that bundles are properly closed after each run
      if (result) result.close()

      switch (code) {
        case 'BUNDLE_START':
          console.log('..Building from', path.relative(rootDir, input))

          break
        case 'BUNDLE_END':
          console.log(
            'Built',
            output
              .map((f) => path.relative(rootDir, f.replace(/\.tmp$/, '')))
              .join(', ')
            // , 'in', (duration / 1000).toFixed(2)+'s'
          )

          if (firstTime) {
            firstTime = false
            resolve()
            return
          }
          if (task.task === 'sass') {
            reloader.reloadCSS()
          } else {
            reloader.reload()
          }
          break
        case 'ERROR':
          // Same format as in ./build
          displayError(error, config)
          break

        // START, END
      }
    })
  })
}

module.exports = dev
