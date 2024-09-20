import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import getPort from '../../utils/getPort.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
export default async function createReloader({ commandName, config, tasks }) {
  const active =
    commandName === 'dev' &&
    config.serve &&
    config.serve.dir &&
    tasks.find((task) => task.task === 'html') !== undefined &&
    // Can be disabled by config
    !(config.serve.reloader === false)
  // TODO: CLI option to disable

  const defaultPort = 35729
  const port = !active
    ? defaultPort
    : await getPort({
        port: getPort.portNumbers(defaultPort, defaultPort + 100),
      })
  const clientScript = !active
    ? ''
    : `<script>${await fs.readFile(
        path.join(__dirname, './client.js'),
        'utf8'
      )}</script>`

  const reloader = {
    active,
    port,
    clientScript,
    reload() {},
    reloadCSS() {},
    async startServer() {
      await (await import('./server.js')).default({
        config,
        reloader,
      })
    },
  }

  return reloader
}
