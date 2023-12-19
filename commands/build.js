/**
 * Build for production
 */

const path = require('path')
const rollup = require('rollup')
const getFileSize = require('../utils/getFileSize')
const displayError = require('../utils/displayError')

async function build(props) {
  const { config, task, inputOptions, outputOptions } = props

  // Custom build task
  if (inputOptions.build) {
    return await inputOptions.build(props)
  }

  const { cwd, rootDir } = config

  console.log('..Building from', path.relative(cwd, inputOptions.input))

  const startTime = new Date()

  try {
    const bundle = await rollup.rollup(inputOptions)

    await bundle.write(outputOptions)
    await bundle.close()
  } catch (e) {
    // Same format as in ./dev
    displayError(e, config)
  }

  const duration = new Date() - startTime
  const builtFile = outputOptions.file.replace(/\.tmp$/, '')
  const fileSize = await getFileSize(builtFile)

  console.log(
    'Built',
    path.relative(cwd, builtFile),
    // , 'in', (duration / 1000).toFixed(2)+'s'
    `(${fileSize})`
  )
}

module.exports = build
