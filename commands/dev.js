/**
 * Build for development and watch files for changes
 *
 * @see https://rollupjs.org/guide/en/#rollupwatch
 */

const path = require('path')
const rollup = require('rollup')
const onExit = require('../utils/onExit')

let watchingMessageDone = false

async function dev(config, inputOptions, outputOptions) {

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

  // This will make sure that bundles are properly closed after each run
  watcher.on('event', (e) => {

    const { code, result, input, output, duration } = e

    if (result) result.close()

    switch (code) {
    case 'BUNDLE_START':
      console.log('Building', path.relative(rootDir, input))
      break
    case 'BUNDLE_END':
      console.log('Built',
        output.map(f => path.relative(rootDir, f)).join(', '),
        'in', (duration / 1000).toFixed(2)+'s'
      )
      break
    case 'ERROR':
      console.log(e.error)
      break

    // START, END
    }
  })

  if ( ! watchingMessageDone ) {
    watchingMessageDone = true
    console.log('Watching files for changes..')
  }
}

module.exports = dev