const getPort = require('../../utils/getPort')

module.exports = async function createReloader({
  commandName,
  config,
  tasks
}) {

  const active = commandName==='dev'
    && config.serve && config.serve.dir
    && tasks.find(task => task.task==='html')!==undefined

  /**
   * A reloader is provided during development, if there's a
   * static file server and HTML files being built. Each task
   * can schedule reload after building a file, and it should
   * automatically reload the browser page, if any.
   *
   * In task/html, a client-side reloader is embedded in HTML.
   * In commands/serve, a WebSocket server is started for sending
   * reload request.
   */
  const defaultPort = 35729
  const reloader = {
    port: !active
      ? defaultPort
      : await getPort({
        port: getPort.portNumbers(defaultPort, defaultPort + 100)
      }),
    active,
    reload() {},
    reloadCSS() {},
    async startServer() {
      await require('./server')({
        config,
        reloader
      })
    }
  }

  return reloader
}