const path = require('path')
const http = require('http')
const getPort = require('get-port')
const handler = require('serve-handler')

async function serve({
  config,
}) {

  const {
    rootDir
  } = config

  const serveOptions = config.serve || {}

  const {
    dir = '.',
    port = 3000,
    node // Require script file path
  } = serveOptions

  if (node) {

    require( path.join(rootDir, node) )

    if (!serveOptions.dir) {
      // Use instead of default static file server
      return
    }
  }

  // https://github.com/zeit/serve-handler#options
  const handlerOptions = {
    public: path.join(rootDir, dir),
    symlinks: true,
    directoryListing: true
  }

  // Create server

  const server = http.createServer((req, res) =>
    handler(req, res, handlerOptions)
  )


  const availablePort = await getPort({ port: getPort.makeRange(port, port + 100) })

  if (serveOptions.port && parseInt(serveOptions.port) !== availablePort) {
    console.log(`..Port ${serveOptions.port} is busy: serving from ${availablePort}`)
  }

  server.listen(availablePort, () => {
    console.log(`..Serving ${
      dir==='.'
        ? 'current directory'
        : 'directory '+dir
    } at`, `http://localhost:${availablePort}`)
  })

}

module.exports = serve