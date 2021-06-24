function help() {

  const { version, homepage } = require('../package.json')

  console.log(`Tangible Roller ${version} - ${homepage}

Usage: roll [command]

Commands:

  dev     Build for development and watch files for changes
  build   Build for production
  serve   Start static file server
`
  )
}

module.exports = help