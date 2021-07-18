/**
 * Build for development and watch files for changes
 *
 * @see https://rollupjs.org/guide/en/#rollupwatch
 */

const path = require('path')
const rollup = require('rollup')
const onExit = require('../utils/onExit')

async function dev(props) {

  const {
    config,
    task,
    inputOptions,
    outputOptions
  } = props

  // Custom build task
  if (inputOptions.build) {
    return await inputOptions.build(props)
  }

  const { rootDir } = config

  const watcher = rollup.watch({
    ...inputOptions,
    output: [outputOptions],
    watch: {
      exclude: /node_modules/,
    }
  })

  onExit(function() {
    watcher.close()
  })

  watcher.on('event', (e) => {

    const { code, result, input, output, duration } = e

    // This will make sure that bundles are properly closed after each run
    if (result) result.close()

    switch (code) {
    case 'BUNDLE_START':

      console.log('..Building from', path.relative(rootDir, input))

      break
    case 'BUNDLE_END':

      console.log('Built',
        output.map(f =>
          path.relative(rootDir, f.replace(/\.tmp$/, ''))
        ).join(', '),
        'in', (duration / 1000).toFixed(2)+'s'
      )

      break
    case 'ERROR':
      // Same format as in ./build
      console.log(
        (e.error.plugin ? `[${e.error.plugin}] `+e.error.message : e.error.message)
          .replace(rootDir, '.')
      )

      // console.log(e.error)
      break

    // START, END
    }
  })
}

module.exports = dev