const path = require('path')
const fs = require('fs')

function createConfig() {

  const rootDir = process.cwd()

  const configJsPath = path.join(rootDir, 'tangible.config.js')
  const packageJsonPath = path.join(rootDir, 'package.json')

  if ( ! fs.existsSync(configJsPath) ) {

    console.log(`
Please create a configuration file named tangible.config.js

Example:

module.exports = {
  build: [
    {
      src:  'src/index.js',
      dest: 'build/index.min.js',
    },
    {
      src:  'src/index.scss',
      dest: 'build/index.min.css',
    },
  ]
}
`
    )

    // TODO: Option to create it automatically and explain task schema

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
    build: tasks = []
  } = tangibleConfig


  return {
    rootDir,
    name, dependencies, devDependencies,
    tasks,
  }
}

module.exports = createConfig