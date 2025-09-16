module.exports = {
  build: [
    {
      src: 'src/index.jsx',
      dest: 'build/test.min.js',
      react: 'react',
      map: true, // Test override global default (source map during development only, remove for production)
    },
    {
      src: 'src/index.jsx',
      dest: 'build/with-preact.min.js',
      react: 'preact', // react, preact, wp
    },
    {
      src: 'src/test/convert.ts',
      dest: 'build/test/convert.js',
      minify: false,
      replaceStrings: {
        'process.env.NODE_ENV': 'production',
        __buildDate__: () => new Date(),
        __buildVersion__: 15
      },
      replaceCode: {
        'process.env.NODE_ENV': '"production"',
        __currentDate__: 'new Date()',
        __currentVersion__: '15'
      },
    },
    {
      src: 'src/index.jsx',
      dest: 'build/with-preact-window.min.js',
      react: 'window.Tangible.Preact',
    },
    {
      src: 'src/wp.jsx',
      dest: 'build/wp.min.js',
      react: 'wp',
    },
    {
      src: 'src/index.scss',
      dest: 'build/test.min.css',
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
    async function ({ config, task = {} }) {
      console.log('Custom build function')
    },
  ],
  format: 'src',
  serve: {
    dir: 'build',
    node: 'server.js',
  },
  archive: {
    src: [
      '**/*',
      '!**/src',
      '!**/test',
      '!build/project.zip',
      '!build/roller-test',
    ],
    dest: 'build/project.zip',
    rootFolder: 'roller-test',
  },
  install: [
    {
      git: 'git@github.com:tangibleinc/framework',
      dest: 'vendor/tangible/framework',
      branch: 'main',
    },
  ],
  installDev: [
    {
      git: 'git@github.com:tangibleinc/fields-pro',
      dest: 'vendor/tangible/fields-pro',
      branch: 'main',
    },
  ],
}
