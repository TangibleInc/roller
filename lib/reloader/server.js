const path = require('path')
const ws = require('ws')
const getPort = require('../../utils/getPort')

let server
let logger

module.exports = async function liveReloadServer(options = {}) {

  const {
    // port = 35729, // Port must be the same in client.js
    log = true,
    init = false, // Reload existing client connection
    reloader = {}
  } = options

  logger = (...args) => log && console.log(...args)

  const availablePort = reloader.port
  // Already found open port when reloader was created
  // await getPort({ port: getPort.portNumbers(port, port + 100) })

  if (!server) server = new ws.Server({ port: availablePort })

  let firstTime = true
  server.on('connection', () => {
    if (!firstTime) return
    logger('Reload client connected')
    firstTime = false
    if (init) reload()
  })

  logger(`Reload server listening at port ${availablePort}`)

  // if (options.watch) {

  //   // Automatically watch and trigger client reload

  //   const watchPath = path.join(options.watch, '**', '*.{js,css}')
  //   const watcher = require('../plugins/gulp-watch')
  //   const watchCommonOptions = require('../config/watch')

  //   let reloading = { js: false, css: false }

  //   watcher(watchPath, watchCommonOptions, ({ event, path: changedFile }) => {

  //     const extension = path.extname(changedFile).slice(1)

  //     if (['js', 'css'].indexOf(extension) < 0
  //       || reloading[extension]
  //     ) return

  //     reloading[extension] = true
  //     setTimeout(() => {
  //       if (extension==='css') reloadCSS()
  //       else reload()
  //       reloading[extension] = false
  //     }, options.watchDelay || 0)
  //   })
  // }

  return Object.assign(reloader, {
    reload,
    reloadCSS
  })

  // return { reload, reloadCSS, availablePort }
}

let scheduleReload

function reload() {
  clearTimeout(scheduleReload)
  scheduleReload = setTimeout(() => {
    // logger && logger()
    server && server.clients.forEach(client => {
      client.send(JSON.stringify({ reload: true }))
    })
  }, 300)
}

function reloadCSS() {
  // logger && logger('css')
  server && server.clients.forEach(client => {
    client.send(JSON.stringify({ reloadCSS: true }))
  })
}
