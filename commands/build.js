/**
 * Build for production
 */

const path = require('path')
const rollup = require('rollup')

async function build(config, inputOptions, outputOptions) {

  const { rootDir } = config

  console.log('Building', path.relative(rootDir, inputOptions.input))

  const startTime = new Date()

  try {

    const bundle = await rollup.rollup(inputOptions)

    await bundle.write(outputOptions)
    await bundle.close()

  } catch(e) {
    console.log(e.message)
  }


  const duration = new Date() - startTime

  console.log('Built',
    outputOptions.file.replace(/\.tmp$/, ''),
    'in', (duration / 1000).toFixed(2)+'s'
  )

}

module.exports = build