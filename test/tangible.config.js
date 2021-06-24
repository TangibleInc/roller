module.exports = {
  build: [
    {
      src: 'index.js',
      dest: 'build/test.min.js',
      react: 'preact' // react, preact, wp
    },
    {
      src: 'index.scss',
      dest: 'build/test.min.css'
    },
  ],
  serve: {
    dir: '.'
  }
}