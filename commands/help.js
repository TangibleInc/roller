function help() {

  const { version } = require('../package.json')

  console.log(`Tangible Roller ${version}

Usage: roll [command]

Commands:

  dev     Build for development and watch files for changes
  build   Build for production
  serve   Start static file server
`
  )
}

module.exports = help