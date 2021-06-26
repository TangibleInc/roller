const path = require('path')
const fs = require('fs')
const readline = require('readline')

function createConfig({
  commandName
}) {

  const rootDir = process.cwd()

  const configJsPath = path.join(rootDir, 'tangible.config.js')
  const packageJsonPath = path.join(rootDir, 'package.json')

  if ( ! fs.existsSync(configJsPath) ) {

    if (commandName==='help') return // No message for help screen

    console.log(`
Please create a configuration file named tangible.config.js

Example:

module.exports = {
  build: [
    {
      src:  'src/index.js',
      dest: 'build/app.min.js',
    },
    {
      src:  'src/index.scss',
      dest: 'build/app.min.css',
    },
  ]
}

For details, visit ${ require('../package.json').homepage }
`
    )

    process.exit()
    return
  }

  const tangibleConfig = require(configJsPath)
  const packageJson = fs.existsSync(packageJsonPath) ? require(packageJsonPath) : {}

  const {
    name = '',
    dependencies = {},
    devDependencies = {}
  } = packageJson

  const {
    build: tasks = [],
    serve
  } = tangibleConfig


  return {
    rootDir,
    env: process.env.NODE_ENV,
    name,
    dependencies,
    devDependencies,
    tasks,
    serve
  }
}

module.exports = createConfig