function displayError(e, config) {

  const { rootDir } = config

  console.log(`\n${e.plugin ? `[${e.plugin}] ` : ''}${
    e.message.replace(rootDir, '.')
  }\n`)
  if (e.frame) console.log(`${e.frame}\n`)
}

module.exports = displayError