
module.exports = () => ({
  async build(props) {
    const { config, task } = props
    if (!task.build) return

    // TODO: Provide watcher during development?

    await task.build(props)
  }
})
