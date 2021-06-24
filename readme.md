# Tangible Roller

Next-generation build tool using [Rollup](https://rollupjs.org/guide/en/) and [ESBuild](https://esbuild.github.io/)

## Requirement

[Node.js](https://nodejs.org/) version 12 or higher is required.


## Install

Install in your project as a dependency for development.

```sh
npm install --save-dev @tangible/roller
```

This provides a local command called `roll`, which can be run using `npm` or `npx`.


## Prepare

Add the following scripts in your project's `package.json` file.

```json
{
  "scripts": {
    "dev": "roll dev",
    "build": "roll build"
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
      src: 'src/index.js',
      dest: 'build/test.min.js'
    },
    {
      src: 'src/index.scss',
      dest: 'build/test.min.css'
    },
  ]
}
```

### Build

The required config property `build` is an array of tasks.

Each task has the following properties:

- `src` - Source file with extension `js`, `ts`, `tsx`, or `scss`
- `dest` - Destination file with extension `min.js`, or `min.css`


#### React mode

The optional task property `react` sets the React mode.

Its value is one of:

- `react` (default) - Files with JSX will automatically import React
- `preact` - Import `react` and `react-dom` are aliased to `preact/compat`
- `wp` - Import `react` and `react-dom` are aliased to global variable `wp.element`


#### Aliases

The following optional task properties perform various substitutions.

- `alias` - Map import module name to target module name or file path
- `importToGlobal` - Map import module name to global variable name
- `globalToImport` - Map global variable name to import module name
- `replaceStrings` - Map string to another string


### Serve

If an optional config property `serve` is defined, a static file server is started during the `dev` or `serve` command.

It is an object with:

- `dir` - Serve from directory - Relative path such as `.`
- `port` - Serve from port - Optional: default is `3000`

To start your own server, define the `node` property.

- `node` - Require script file path

This can be used with or without the `dir` property.


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
npx roll [command]
```

Run the above without any command to see a help screen.

