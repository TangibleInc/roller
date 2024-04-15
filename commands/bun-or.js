/**
 * bun-or command: Run with bun or given fallback such as npm, node
 */
const { execSync, spawn } = require('node:child_process')

function run(command, args, silenceError = false) {
  return new Promise((resolve, reject) => {
    const p = spawn(command, args)
    p.stdout.on('data', data => process.stdout.write(data))
    p.stderr.on('data', data => silenceError ? null : process.stderr.write(data))
    p.on('close', code => code===0 ? resolve() : reject())
    p.on('error', reject)
  })
}

module.exports = async function bunOr(props = {}) {

  const {
    argv = process.argv
  } = props
  const args = argv.slice(3) // Skip command name 

  if (!args.length) {
    console.log(`This command runs bun or the given fallback such as npm, npx, node, tsx
Usage: roll bun-or [command] [...options]
Example:
  roll bun-or tsx server.ts
  roll bun-or npm run docs
`)
    return
  }

  try {
    // Check if Bun installed
    execSync('bun', {
      stdio: 'ignore'
    })
  } catch(e) {
    if (args[0]==='tsx') {
      const { default: runEsbuild } = await import('./run.js')
      // Use our own run command instead tsx which uses a different version of esbuild
      return await runEsbuild({
        argv: ['node', 'roll', 'run', ...args.slice(1)],
        bun: false
      })
    }

    return await run(
      args[0],
      args.slice(1)
    )
  }

  // Run with Bun
  await run(
    args[0]==='npx' ? 'bunx' : 'bun',
    args.slice(1),
    true
  )
}
