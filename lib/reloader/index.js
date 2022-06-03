const path = require('path')
const fs = require('fs').promises
const getPort = require('../../utils/getPort')

/**
 * Reloader is provided during development, if there's a
 * static file server and HTML files being built. Each task
 * can schedule reload after build is done, and it should
 * automatically reload the browser page, if any.
 *
 * In task/html, a client-side reloader is embedded in HTML.
 * In commands/serve, a WebSocket server is started for sending
 * reload request.
 */
module.exports = async function createReloader({ commandName, config, tasks }) {
  const active =
    commandName === 'dev' &&
    config.serve &&
    config.serve.dir &&
    tasks.find((task) => task.task === 'html') !== undefined &&
    // Can be disabled by config
    !(config.serve.reloader === false)
  // TODO: CLI option to disable

  const defaultPort = 35729
  const reloader = {
    port: !active
      ? defaultPort
      : /**
         * Find available port in a range
         * This is passed to the reload server, and client script in task/html
         */
        await getPort({
          port: getPort.portNumbers(defaultPort, defaultPort + 100),
        }),
    active,
    clientScript: !active
      ? ''
      : `<script>${await fs.readFile(
          path.join(__dirname, './client.js'),
          'utf8'
        )}</script>`,
    reload() {},
    reloadCSS() {},
    async startServer() {
      await require('./server')({
        config,
        reloader,
      })
    },
  }

  return reloader
}
