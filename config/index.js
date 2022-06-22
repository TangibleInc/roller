const path = require('path')
const fs = require('fs')

function createConfig({ commandName, args }) {

  if (args[0]) {
    try {
      process.chdir(args[0])
    } catch (e) {
      console.warn(`Error changing into project directory "${args[0]}"`)
      process.exit(1)
    }
  }

  const rootDir = process.cwd()

  const configJsPath = path.join(rootDir, 'tangible.config.js')
  const packageJsonPath = path.join(rootDir, 'package.json')

  if (!fs.existsSync(configJsPath)) {
    if (commandName === 'help') return // No message for help screen

    // TODO: Provide command "init" to create new config

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
  ],
  format: 'src'
}

Documentation: ${require('../package.json').homepage}
`)

    process.exit()
    return
  }

  const configJson = require(configJsPath)
  const packageJson = fs.existsSync(packageJsonPath)
    ? require(packageJsonPath)
    : {}

  const { name = '', dependencies = {}, devDependencies = {} } = packageJson

  const { build: tasks = [], format, lint, serve } = configJson

  const env = process.env.NODE_ENV
  const isDev = env === 'development'

  return {
    rootDir,
    env,
    isDev,

    name,
    dependencies,
    devDependencies,

    tasks,
    format,
    lint,
    serve,
  }
}

module.exports = createConfig
