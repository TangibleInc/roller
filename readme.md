# Tangible Roller

> Build project assets using [Rollup](https://rollupjs.org/guide/en/) and [ESBuild](https://esbuild.github.io/)

The purpose of this tool is to compile JavaScript, TypeScript, Sass, and other file types into minified bundles with source maps.

#### Source code

https://github.com/tangibleinc/tangible-roller


## Requirement

[Node.js](https://nodejs.org/) version 18 or higher is required.


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

Press CTRL + C to stop.

**Build for production**

```sh
npm run build
```

**Format files to code standard**

```sh
npm run format
```

**Run TypeScript file**

Builds the given file and runs it.

```sh
npx roll run [file] [...options]
```

Example:

```sh
npx roll run index.ts
```

**Create zip package for archive**

```sh
npx roll archive
```

**Other commands**

Use `npx`, which is bundled with Node.js, to run other builder commands.

```sh
npx roll [command]
```

Run the above without any command to see a help screen.

**Project directory**

Optionally specify a child directory as project root

```sh
npm run [command] [folder]
npx roll [command] [folder]
```

The `build` and `format` commands support multiple projects.

```sh
npm run build [...folders]
npm run format [...folders]
```

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
- `wp` - Import modules `react` and `react-dom` are aliased to global variable `wp.element`. Also, import modules `@wordpress/*` are aliased to properties under global variable `wp`.


#### Aliases

The following optional task properties perform various substitutions.

##### alias

Using `alias` you can map an import module name to target another module name or file path. This uses rollup's [alias](https://github.com/rollup/plugins/tree/master/packages/alias#custom-resolvers) plugin under the hood.

Here's an example use of the `alias` parameter:

```js
module.exports = {
  build: [
    {
      src: 'src/index.js',
      dest: 'build/app.min.js',
      alias: [
        {
          find: 'src',
          replacement: path.resolve(projectRootDir, 'src')
        }
      ]
    },
  // ...
}
```

##### importToGlobal

Using `importToGlobal` you can map import module names to global variable names. It supports dynamic names such as `@example/*`, for which a function should be given that takes the module name and returns the variable name:

```js
module.exports = {
  build: [
    {
      src: 'src/index.js',
      dest: 'build/app.min.js',
      importToGlobal: {
        '@my-namespace/*': 'myGlobalVar.*'
      }
    },
  // ...
}
```

In WordPress mode Roller imports `@wordpress/*` into the global variable `wp.*`.

##### globalToImport

Using `globalToImport` would be a reverse situation of using `importToGlobal`. Here you can map a global variable name to an import module name. This uses Rollup's [inject](https://github.com/rollup/plugins/tree/master/packages/inject) plugin under the hood.

```js
module.exports = {
  build: [
    {
      src: 'src/index.js',
      dest: 'build/app.min.js',
      globalToImport: {
        // import { Promise } from 'es6-promise'
        Promise: [ 'es6-promise', 'Promise' ],

        // import { Promise as P } from 'es6-promise'
        P: [ 'es6-promise', 'Promise' ],

        // import $ from 'jquery'
        $: 'jquery',

        // import * as fs from 'fs'
        fs: [ 'fs', '*' ],

        // use a local module instead of a third-party one
        'Object.assign': path.resolve( 'src/helpers/object-assign.js' ),
      }
    },
  // ...
}
```

##### replaceStrings

Using `replaceStrings` you can [map a string to another string](https://github.com/rollup/plugins/tree/master/packages/replace) during script processing. It can be handy for replacing placeholders with actual variables.

```js
module.exports = {
  build: [
    {
      src: 'src/index.js',
      dest: 'build/app.min.js',
      replaceStrings: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        __buildDate__: () => JSON.stringify(new Date()),
        __buildVersion: 15
      },
      replaceInclude: [ // By default all files are included, but you can specify include patterns or names
        path.resolve( 'some/path/' ),
        /\.[jt]sx?$/,
        /node_modules/
      ]
    },
  // ...
}
```

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

Folders named `node_modules` and `vendor` are excluded by default.

#### Example: All files in directory

```
format: 'src'
```

#### Example: Plugin

```
format: [
  'assets',
  '!assets/build',
  '**/*.php',
  '!test'
]
```

### Archive

Run the `archive` command to create a zip package of the project.

It requires the config property `archive`. It is an object with

- `src` - Source of all files: string or an array of path patterns to match
- `dest` - Path to destination file with extension `.zip`
- `exclude` - Optional: String or an array of path patterns to match folders and files to exclude from the package

### Install dependencies

Run the `install` command to install dependencies for production or development.

```sh
npx roll install
```

This requires the config property `install`. It is a list of objects which define a dependency.

- `zip` - Zip package URL, or
- `git` - Git repository URL
- `branch` - Git branch - Optional: default is `main`
- `dest` - Path to destination folder

It can be useful to run this as `postinstall` script, to prepare a project.

#### Dev dependencies

An optional config property `installDev` defines dependencies needed only during development, such as third-party plugins or companion libraries.

These can be installed with the `--dev` option.

```sh
npx roll install --dev
```

#### Update

To update the dependencies, run the `update` command. Git repositories pull from remote origin, and zip sources are downloaded optionally by prompting yes or no.

Use the `--dev` option to update dev dependencies also.

## Comparison with Tangible Builder

Tangible Roller is the next generation of the build tool. It's much faster, and better compatible with Node.js version 12 and above.

The configuration schema in `tangible.config.js` is almost the same, except:

- JS files with React JSX syntax must have file extension `.jsx`

- For each build task's config, the `watch` property is no longer needed and can be removed.  All imported files are automatically watched for changes.

- Similarly, the `task` property (js/sass/html) can be removed.  The task type is automatically inferred from the file extension in `src` property.
