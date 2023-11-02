const { execSync } = require('child_process')

const run = (cmd, options = {}) =>
  new Promise((resolve, reject) => {
    const { silent = false, capture = false, cwd = process.cwd() } = options

    // if (!silent && !capture) console.log(cmd)

    try {
      const result = capture
        ? execSync(cmd, { stdio: 'pipe', cwd }).toString()
        : execSync(cmd, { stdio: 'inherit', cwd })

      if (capture) return resolve(result)
      if (result && !silent) console.log(result)
      resolve()
    } catch (e) {
      reject(e)
    }
  })

module.exports = run