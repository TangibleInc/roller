import path from 'path'
import { WebSocketServer } from 'ws'
import getPort from '../../utils/getPort.js'

export default async function liveReloadServer(options = {}) {
  const {
    // port = 35729, // Port must be the same in client.js
    log = true,
    init = false, // Reload existing client connection
    reloader = {},
  } = options

  const logger = (...args) => log && console.log(...args)

  const availablePort = reloader.port
  // Already found open port when reloader was created
  // await getPort({ port: portNumbers(port, port + 100) })

  const server = new WebSocketServer({ port: availablePort })

  let firstTime = true
  server.on('connection', () => {
    if (!firstTime) return
    logger('Reload client connected')
    firstTime = false
    if (init) reload()
  })

  logger(`Reload server listening at port ${availablePort}`)

  let scheduleReload

  return Object.assign(reloader, {
    reload() {
      clearTimeout(scheduleReload)
      scheduleReload = setTimeout(() => {
        if (!server) return
        server.clients.forEach((client) => {
          client.send(JSON.stringify({ reload: true }))
        })
      }, 300)
    },
    reloadCSS() {
      if (!server) return
      server.clients.forEach((client) => {
        client.send(JSON.stringify({ reloadCSS: true }))
      })
    },
  })
}
