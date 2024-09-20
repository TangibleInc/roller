/**
 * Run command: Build a script with ESBuild and run
 */
import path, { join as joinPath, isAbsolute } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
// import fs from 'node:fs'
// import url from 'node:url'
import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
// import bunOr from './bun-or.js'
import prompt from '../utils/prompt.js'

/**
 * Replace __dirname based on source file path
 * @see https://github.com/evanw/esbuild/issues/859#issuecomment-1335102284
 */

const nodeModules = new RegExp(
  /^(?:.*[\\/])?node_modules(?:\/(?!postgres-migrations).*)?$/,
)

const dirnamePlugin = {
  name: 'dirname',
  setup(build) {
    build.onLoad({ filter: /.*/ }, ({ path: filePath }) => {
      if (!filePath.match(nodeModules)) {
        let contents = readFileSync(filePath, 'utf8')
        const loader = path.extname(filePath).substring(1)
        const dirname = path.dirname(filePath)
        contents = contents
          .replaceAll('__dirname', `"${dirname}"`)
          .replaceAll('__filename', `"${filePath}"`)
        return {
          contents,
          loader,
        }
      }
    })
  },
}

export default async function runEsbuild(props = {}) {
  const {
    argv: _argv = process.argv,
    projectPath = process.cwd(),
    bun = true,
  } = props

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

  /**
   * A way to pass environment variables: roll run index.ts NODE_ENV=test
   */
  for (const arg of rest) {
    if (arg.includes('=')) {
      const [key, value] = arg.split('=')
      process.env[key] = value
    }
  }

  const watchMode = rest.includes('--watch')

  function runBuiltResult(result) {
    const bundled_js_buffer = Buffer.concat(
      result.outputFiles.map(({ contents }) => contents),
    )

    try {
      execSync(`node --enable-source-maps --input-type=module`, {
        cwd: projectPath,
        input: bundled_js_buffer,
        stdio: [`pipe`, `inherit`, `inherit`],
        env: process.env,
      })
    } catch (e) {
      // Error message already output by child process
      return e
    }
  }

  let context

  const waitNextRun = async () => {
    console.log(
      '..Waiting for file changes - Press CTRL+C to exit, or enter to run again',
    )
    if ((await prompt()) === false) {
      process.exit()
    } else {
      await context.rebuild()
    }
  }
  const runnerPlugin = {
    name: 'run',
    setup(build) {
      build.onEnd((result) => {
        const error = runBuiltResult(result)
        if (watchMode) {
          waitNextRun().catch((e) => {
            console.error(e)
            // process.exit(1)
          })
        } else if (error) {
          context.dispose().finally(() => process.exit(1))
          return
        }
      })
    },
  }

  try {
    context = await esbuild.context({
      // absWorkingDir: path.dirname(argv_entry_point),
      entryPoints: [argv_entry_point],
      bundle: true, // Support importing other TypeScript files
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
        // '*',
      ],
      define: {
        'process.env': JSON.stringify(process.env),
      },
      plugins: [nodeExternalsPlugin(), dirnamePlugin, runnerPlugin],
    })

    if (watchMode) {
      await context.watch()
    } else {
      await context.rebuild()
      await context.dispose()
    }
  } catch (error) {
    console.error(error.message)
    console.error(error.stack)
    if (!watchMode) {
      process.exit(1)
    }
  }
}
