# Tangible Roller

> Build project assets using [Rollup](https://rollupjs.org/guide/en/) and [ESBuild](https://esbuild.github.io/)

The purpose of this tool is to compile a set of JavaScript/TypeScript, SASS, HTML and other files into minified bundles with source maps.


## Requirement

[Node.js](https://nodejs.org/) version 12 or higher is required.


## Install

Install in your project as a dependency for development.

```sh
npm install --save-dev @tangible/roller
```

This provides a local command called `roll`, which can be run using `npm` or `npx`.


## Scripts

Add the following NPM scripts in your project's `package.json` file.

```json
{
  "scripts": {
    "dev": "roll dev",
    "build": "roll build",
    "format": "roll format"
  }
}
```

These can be run from the terminal when you're inside the project folder.


## Usage

**Build for development and watch files for changes**

```sh
npm run dev
```

**Build for production**

```sh
npm run build
```

**Format files to code standard**

```sh
npm run format
```

**Other commands**

Use `npx`, which is bundled with Node.js, to run other builder commands.

```
npx roll [command]
```

Run the above without any command to see a help screen.


## Config

Before starting, the builder needs a configuration file.

Create a file called `tangible.config.js` in your project folder.

Example:

```js
module.exports = {
  build: [
    {
      src: 'src/index.js',
      dest: 'build/app.min.js'
    },
    {
      src: 'src/index.scss',
      dest: 'build/app.min.css'
    },
  ],
  format: 'src'
}
```

The config file exports an object with the following properties.

- [`build`](#build) - Array of build tasks
- [`serve`](#serve) - Optional: Server config
- [`format`](#format) - Optional: Format config


### Build

The required config property `build` is an array of tasks.

Each task is an object with the following properties:

- `src` - Source file with extension `js`, `jsx`, `ts`, `tsx`, `scss`, or `html`
- `dest` - Destination file with extension `min.js`, `min.css`, or `html`

During development, the source files are watched for any changes, and rebuilt as needed.


#### React mode

Files with React JSX syntax must have extension `jsx` or `tsx`. They will automatically import `React`.

The optional task property `react` sets the React mode.

Its value is one of:

- `react` (default)
- `preact` - Import modules `react` and `react-dom` are aliased to `preact/compat`
- `wp` - Import modules `react` and `react-dom` are aliased to global variable `wp.element`


#### Aliases

The following optional task properties perform various substitutions.

- `alias` - Map import module name to target module name or file path
- `importToGlobal` - Map import module name to global variable name
- `globalToImport` - Map global variable name to import module name
- `replaceStrings` - Map string to another string

#### HTML

HTML files are compiled using a template engine called [`eta`](https://eta.js.org/). Visit the link for its documentation.

For the HTML build task, the `src` property can be a single file name or [glob syntax](https://github.com/isaacs/node-glob#glob-primer) for multiple files. In the latter case, the `dest` property must specify the destination directory name. (It can be also for single file.)


### Serve

If an optional config property `serve` is defined, a static file server is started during the `dev` and `serve` command.

It is an object with:

- `dir` - Serve from directory - Relative path such as `.`
- `port` - Serve from port - Optional: default is `3000`

To start your own server, define the `node` property.

- `node` - Require script file path

This can be used with or without the `dir` property.


### Format

Run the `format` command to automatically format files to code standard.

It requires the config property `format`, which is a string or an array of path patterns to match.

Use `*` as wildcard, `**` to match any directory levels, and `!` to exclude pattern. Use `{}` and a comma-separated list to match multiple items.

Folders named `node_modules` and `vendor` are excluded.

#### Example: All files in directory

```
format: 'src'
```

#### Example: Static site

```
format: 'src/**/*.{html,js,scss}'
```

#### Example - Plugin

```
format: [
  'assets/src/**/*.{js,scss}',
  '**/*.php',
  '!test'
]
```

