const path = require('path')
const http = require('http')
const getPort = require('../utils/getPort')
const handler = require('serve-handler')

async function serve({ config }) {
  const { rootDir, isDev } = config

  const serveOptions = config.serve || {}

  const {
    dir = '.',
    port = 3000,
    node, // Require script file path
  } = serveOptions

  if (node) {
    const scriptPath = path.join(rootDir, node)

    /**
     * Use nodemon for reloadable server - Previously: require( scriptPath )
     * @see https://github.com/remy/nodemon/blob/main/doc/requireable.md
     */

    const nodemon = require('nodemon')

    nodemon({
      script: scriptPath,
      watch: serveOptions.watch || false,
    })

    console.log(
      `..Running custom server from ${path.relative(
        rootDir,
        scriptPath
      )} - Enter rs to reload`
    )

    if (!isDev) {
      // Necessary to prevent error after SIGTERM exit
      nodemon.on('quit', function () {
        process.exit()
      })
    }

    if (!serveOptions.dir) {
      // Use instead of default static file server
      return
    }
  }

  // https://github.com/zeit/serve-handler#options
  const handlerOptions = {
    public: path.join(rootDir, dir),
    symlinks: true,
    directoryListing: true,
    // trailingSlash: true,
    // cleanUrls: false,
  }

  // Create server

  const server = http.createServer((req, res) =>
    handler(req, res, handlerOptions)
  )

  const availablePort = await getPort({
    port: getPort.portNumbers(port, port + 100),
  })

  if (serveOptions.port && parseInt(serveOptions.port) !== availablePort) {
    console.log(`..Port ${serveOptions.port} is busy - Using ${availablePort}`)
  }

  return await new Promise((resolve, reject) => {
    let firstTime = true

    server.listen(availablePort, () => {
      console.log(
        `Serve ${dir === '.' ? 'current directory' : 'directory ' + dir} at`,
        `http://localhost:${availablePort}`
      )

      if (firstTime) {
        firstTime = false
        resolve()
      }
    })
  })
}

module.exports = serve
