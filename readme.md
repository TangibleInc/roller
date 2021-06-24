# Tangible Roller

Next-generation build tool using [Rollup](https://rollupjs.org/guide/en/) and [ESBuild](https://esbuild.github.io/)

## Requirement

[Node.js](https://nodejs.org/) version 12 or higher is required.


## Install

```sh
npm install --save-dev @tangible/roller
```

This provides a local command called `tgr`.


## Prepare

Add the following scripts in your project's `package.json` file.

```json
{
  "scripts": {
    "dev": "tgr dev",
    "build": "tgr build"
  }
}
```

These can be run from the terminal when you're inside the project folder.  See the [Usage](#usage) section below for more description.

Before starting, the builder needs a configuration file.


## Config

Create a file called `tangible.config.js` in your project folder.

Example:

```js
module.exports = {
  build: [
    {
      src: 'index.js',
      dest: 'build/test.min.js'
    },
    {
      src: 'index.scss',
      dest: 'build/test.min.css'
    },
  ]
}
```

The `build` property is an array of tasks. Each task has the following properties:

- `src` - Source file with extension `js`, `ts`, `tsx`, or `scss`
- `dest` - Destination file with extension `min.js`, or `min.css`


## Usage

**Build for development and watch files for changes**

```sh
npm run dev
```

**Build for production**

```sh
npm run build
```

**Other commands**

Use `npx`, which is bundled with Node.js, to run other builder commands.

```
npx tgr [command]
```

Run the above without any command to see a help screen.

