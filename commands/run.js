/**
 * Run command: Build a script with ESBuild and run
 */
const esbuild = require('esbuild')
const { existsSync } = require('node:fs')
const { execSync } = require('node:child_process')
// const fs = require('node:fs')
// const url = require('node:url')
const { join: joinPath, isAbsolute } = require('node:path')
// const bunOr = require('./bun-or')

module.exports = async function runEsbuild(props = {}) {
  const { argv: _argv = process.argv, bun = true } = props

  const [node, , , entry_point, ...rest] = _argv

  if (!entry_point) {
    console.log(`Run the given TypeScript file

Usage: roll run [file] [...options]

Example:
  roll run index.ts
`)
    return
  }

  // if (bun) {
  //   // Try running with bun first
  //   return await bunOr({
  //     argv: ['node', 'roll', 'bun-or', 'tsx', entry_point, ...rest]
  //   })
  // }

  const cwd = process.cwd()
  const argv_entry_point = isAbsolute(entry_point)
    ? entry_point
    : joinPath(cwd, entry_point)


  if (!existsSync(argv_entry_point)) {
    console.log('File not found:', argv_entry_point)
    return
  }

  const argv = [node, argv_entry_point, ...rest]

  try {
    const result = await esbuild.build({
      entryPoints: [entry_point],
      bundle: true,
      splitting: false,
      treeShaking: true,
      platform: `node`,
      target: `node18`,
      format: `esm`,
      resolveExtensions: [`.ts`, `.js`, `.json`, `.mjs`, `.cjs`],
      minify: false,
      // sourcemap: `inline`, // enable this when https://github.com/nodejs/node/issues/46454 gets fixed
      write: false,
      external: [
        '*',
      ],
      define: {
        'process.env': JSON.stringify(process.env),
      },
      plugins: [],
    })

    const bundled_js_buffer = Buffer.concat(
      result.outputFiles.map(({ contents }) => contents)
    )

    const env = argv.reduce((env, arg) => {
      if (arg.includes('=')) {
        const [key, value] = arg.split('=')
        env[key] = value
      }
      return env
    }, {})
    try {
      execSync(`node --enable-source-maps --input-type=module`, {
        input: bundled_js_buffer,
        stdio: [`pipe`, `inherit`, `inherit`],
        env: {
          ...process.env,
          ...env
        },
      })
    } catch (e) {
      // Error message already output by child process
      process.exit(1)
    }
  } catch (error) {
    console.error(error.message)
    console.error(error.stack)
    process.exit(1)
  }
}
