/**
 * Process exit hook for clean up
 *
 * Based on: https://github.com/sindresorhus/exit-hook/blob/main/index.js
 */

const callbacks = new Set()
let isCalled = false
let isRegistered = false

function exit(exit, signal) {
  if (isCalled) {
    return
  }

  isCalled = true

  for (const callback of callbacks) {
    callback()
  }

  if (exit === true) {
    process.exit(128 + signal)
  }
}

function onExit(callback) {
  callbacks.add(callback)

  if (!isRegistered) {
    isRegistered = true

    process.once('exit', exit)
    process.once('SIGINT', exit.bind(null, true, 2))
    process.once('SIGTERM', exit.bind(null, true, 15))

    // PM2 Cluster shutdown message. Caught to support async handlers with pm2, needed because
    // explicitly calling process.exit() doesn't trigger the beforeExit event, and the exit
    // event cannot support async handlers, since the event loop is never called after it.
    process.on('message', (message) => {
      if (message === 'shutdown') {
        exit(true, -128)
      }
    })
  }

  return function () {
    callbacks.delete(callback)
  }
}

module.exports = onExit
