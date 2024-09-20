import { execSync } from 'child_process'

export default function run(cmd, options = {}) {
  return new Promise((resolve, reject) => {
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
}
