module.exports = {
  build: [
    {
      src: 'src/index.jsx',
      dest: 'build/test.min.js',
      react: 'preact' // react, preact, wp
    },
    {
      src: 'src/wp.jsx',
      dest: 'build/wp.min.js',
      react: 'wp'
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
  format: 'src',
  serve: {
    dir: 'build',
    node: 'server.js'
  }
}