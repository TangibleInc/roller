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
      dest: 'build',
    },
  ],
  serve: {
    dir: 'build',
    node: 'server.js'
  }
}