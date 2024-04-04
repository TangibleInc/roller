const path = require('path')
const fs = require('fs')
const url = require('url')

const prompt = require('../utils/prompt')
const run = require('../utils/run')

async function createConfig({ commandName, args }) {
  const cwd = process.cwd()
  let rootDir = cwd
  let isChildProjectFolder = false

  const configJsFileName = 'tangible.config.js'

  let configJsPath = path.join(rootDir, configJsFileName)

  if (args[0]) {
    const name = args[0]

    // Child project config file
    const customConfigJsPath = path.join(rootDir, `tangible.config.${name}.js`)

    if (fs.existsSync(customConfigJsPath)) {
      configJsPath = customConfigJsPath
    } else {
      // Child project directory
      configJsPath = path.join(rootDir, name, configJsFileName)

      if (fs.existsSync(configJsPath)) {
        /**
         * Was using process.chdir(name) but some rollup internals is using
         * del() to remove previously built files, and it throws an error when
         * they're outside the current working directory.
         */
        rootDir = path.join(rootDir, name)
        isChildProjectFolder = true
      } else {
        console.warn(
          `Couldn't find project directory with tangible.config.js, or any project config file, tangible.config.${name}.js`
        )
        process.exit(1)
      }
    }
  }

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

  /**
   * ES Module loading with abolute path fails on Windows unless it's
   * converted to URL: https://github.com/nodejs/node/issues/31710
   */
  const configJsPathUrl = url.pathToFileURL(configJsPath).href

  const { default: configJson } = await import(configJsPathUrl)
  // const configJson = require(configJsPath) // Previously with CommonJS

  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageJson = fs.existsSync(packageJsonPath)
    ? require(packageJsonPath)
    : {}

  const { name = '', dependencies = {}, devDependencies = {} } = packageJson

  const {
    build: tasks = [],
    format,
    lint,
    serve,
    archive
  } = configJson instanceof Function ? await configJson() : configJson

  // Ensure project dependencies are installed
  if (
    Object.keys(dependencies).length > 0 &&
    !fs.existsSync(path.join(rootDir, 'node_modules'))
  ) {
    console.log('Project has uninstalled dependencies')
    console.log()
    const answer = await prompt(
      'Press enter to run "npm install", or CTRL+C to cancel..'
    )
    console.log()
    if (answer === false) {
      // Cancelled
      process.exit()
    }
    console.log('npm install')
    await run('npm install --production', {
      cwd: rootDir
    })
    console.log()
  }

  const env = process.env.NODE_ENV
  const isDev = env === 'development'

  return {
    cwd,
    rootDir,
    env,
    isDev,

    name,
    dependencies,
    devDependencies,

    tasks: !isChildProjectFolder
      ? tasks
      : tasks.map((task) => ({
          ...task,
          src: task.src.startsWith('/')
            ? task.src
            : path.join(rootDir, task.src),
          dest: task.dest.startsWith('/')
            ? task.dest
            : path.join(rootDir, task.dest),
        })),

    format,
    lint,
    serve,
    archive,
  }
}

module.exports = createConfig
