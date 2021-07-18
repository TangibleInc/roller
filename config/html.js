const path = require('path')

async function build({
  config,
  task,
  inputOptions,
  outputOptions
}) {

  const {
    rootDir
  } = config

  const {
    src,
    dest
  } = task

  console.log('..Building from', path.relative(rootDir, src))

}

module.exports = () => ({ build })