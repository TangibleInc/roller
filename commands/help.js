function help() {
  const { version, homepage, description } = require('../package.json')

  console.log(`Tangible Roller ${version}

${description}

Usage: roll [command]

Commands:

  dev     Build for development and watch files for changes
  build   Build for production
  serve   Start static file server
  format  Format files to code standard

Documentation: ${homepage}
`)
}

module.exports = help
