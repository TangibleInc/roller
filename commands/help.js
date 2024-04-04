function help() {
  const { version, homepage, description } = require('../package.json')

  console.log(`Tangible Roller ${version}

${description}

Usage: roll [command]

Commands:

  dev      Build for development and watch files for changes
  build    Build for production
  format   Format files to code standard
  lint     Run linter to report potential issues
  list     List all modules in the project with a config file
  serve    Start static file server
  archive  Create zip package

Documentation: ${homepage}
`)
}

module.exports = help
