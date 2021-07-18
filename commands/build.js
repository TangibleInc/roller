/**
 * Build for production
 */

const path = require('path')
const rollup = require('rollup')
const getFileSize = require('../utils/getFileSize')

async function build(props) {

  const {
    config,
    task,
    inputOptions,
    outputOptions
  } = props

  const { rootDir } = config

  console.log('..Building from', path.relative(rootDir, inputOptions.input))

  const startTime = new Date()

  try {

    const bundle = await rollup.rollup(inputOptions)

    await bundle.write(outputOptions)
    await bundle.close()

  } catch(e) {
    // Same format as in ./dev
    console.log(
      (e.plugin ? `[${e.plugin}] `+e.message : e.message)
        .replace(rootDir, '.')
    )
  }


  const duration = new Date() - startTime
  const builtFile = outputOptions.file.replace(/\.tmp$/, '')
  const fileSize = await getFileSize(builtFile)

  console.log('Built',
    builtFile,
    'in',
    (duration / 1000).toFixed(2)+'s',
    `(${fileSize})`
  )

}

module.exports = build