module.exports = {
  build: [
    {
      src: 'src/index.js',
      dest: 'build/test.min.js',
      react: 'preact' // react, preact, wp
    },
    {
      src: 'src/index.scss',
      dest: 'build/test.min.css'
    },
    {
      src: 'src/index.html',
      dest: 'build/index.html',
    },
    {
      src: 'src/child/**/index.html',
      dest: 'build/child',
    },
    {
      task: 'copy',
      src: 'public',
      dest: 'build',
    },
    async function({ config, task = {} }) {
      console.log('Custom build function')
    }

  ],
  serve: {
    dir: 'build',
    node: 'server.js'
  }
}