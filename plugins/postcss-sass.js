'use strict';

var sourceMap = require('source-map');
var sassResolve = require('@csstools/sass-import-resolve');
var sass = require('sass');
var path = require('path');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var sassResolve__default = /*#__PURE__*/_interopDefaultLegacy(sassResolve);
var sass__default = /*#__PURE__*/_interopDefaultLegacy(sass);

// tooling

const sassMatch = /#sass$/; // returns merged source maps

var mergeSourceMaps = (...maps) => {
  // new sourcemap
  const generator = new sourceMap.SourceMapGenerator(); // existing sourcemaps

  const consumersPromise = Promise.all(maps.map(map => new sourceMap.SourceMapConsumer(map)));
  return consumersPromise.then(consumers => consumers.forEach(consumer => {
    // copy each original mapping to the new sourcemap
    consumer.eachMapping(mapping => {
      const originalPosition = originalPositionFor(mapping, consumers);

      if (originalPosition.source) {
        generator.addMapping({
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          },
          original: {
            // use positive numbers to work around sass/libsass#2312
            line: Math.abs(originalPosition.line),
            column: Math.abs(originalPosition.column)
          },
          source: originalPosition.source,
          name: originalPosition.name
        });
      }
    }); // copy each original source to the new sourcemap

    consumer.sources.forEach(source => {
      generator._sources.add(source);

      const content = consumer.sourceContentFor(source);

      if (content !== null) {
        generator.setSourceContent(source, content);
      }
    });
  })).then(() => {
    // merged map as json
    const mergedMap = JSON.parse(generator); // clean all special sass sources in merged map

    mergedMap.sources = mergedMap.sources.map(source => source.replace(sassMatch, ''));
    return mergedMap;
  });
};

function originalPositionFor(mapping, consumers) {
  // initial positioning
  let originalPosition = {
    line: mapping.generatedLine,
    column: mapping.generatedColumn
  }; // special sass sources are mapped in reverse

  consumers.slice(0).reverse().forEach(consumer => {
    const possiblePosition = consumer.originalPositionFor(originalPosition);

    if (possiblePosition.source) {
      if (sassMatch.test(possiblePosition.source)) {
        originalPosition = possiblePosition;
      }
    }
  }); // regular sources are mapped regularly

  consumers.forEach(consumer => {
    const possiblePosition = consumer.originalPositionFor(originalPosition);

    if (possiblePosition.source) {
      if (!sassMatch.test(possiblePosition.source)) {
        originalPosition = possiblePosition;
      }
    }
  });
  return originalPosition;
}

// tooling
const requiredPostConfig = {
  map: {
    annotation: false,
    inline: false,
    sourcesContent: true
  }
};
const requiredSassConfig = {
  omitSourceMapUrl: true,
  sourceMap: true,
  sourceMapContents: true
}; // transform css with sass

const plugin = (opts = {}) => {
  return {
    postcssPlugin: "postcss-sass",

    Once(root, {
      result,
      parse
    }) {
      // postcss configuration
      const postConfig = Object.assign({}, result.opts, requiredPostConfig); // postcss results

      const _root$toResult = root.toResult(postConfig),
            postCSS = _root$toResult.css,
            postMap = _root$toResult.map; // include paths


      const includePaths = [].concat(opts && opts.includePaths || []); // sass engine to use

      const sassEngine = opts && opts.sass || sass__default['default']; // sass resolve cache

      const cache = {}; // replication of the default sass file importer

      const defaultSassImporter = (id, parentId, done) => {
        // resolve the absolute parent
        const parent = path.resolve(parentId); // cwds is the list of all directories to search

        const cwds = [path.dirname(parent)].concat(includePaths).map(includePath => path.resolve(includePath));
        cwds.reduce( // resolve the first available files
        (promise, cwd) => promise.catch(() => sassResolve__default['default'](id, {
          cwd,
          cache,
          readFile: true
        })), Promise.reject()).then(({
          file,
          contents
        }) => {
          // pass the file and contents back to sass
          done({
            file,
            contents
          });
        }, importerError => {
          // otherwise, pass the error
          done(importerError);
        });
      }; // sass importer


      const sassImporter = opts && opts.importer || defaultSassImporter;
      return new Promise( // promise sass results
      (resolve, reject) => sassEngine.render( // pass options directly into node-sass
      Object.assign({}, opts, requiredSassConfig, {
        file: `${postConfig.from}#sass`,
        outFile: postConfig.from,
        data: postCSS,

        importer(id, parentId, done) {
          const doneWrap = importerResult => {
            const file = importerResult && importerResult.file;

            if (file) {
              const parent = path.resolve(parentId); // push the dependency to watch tasks

              result.messages.push({
                type: "dependency",
                file,
                parent
              });
            }

            done(importerResult);
          }; // strip the #sass suffix we added


          const prev = parentId.replace(/#sass$/, ""); // call the sass importer and catch its output

          sassImporter.call(this, id, prev, doneWrap);
        }

      }), (sassError, sassResult) => sassError ? reject(sassError) : resolve(sassResult))).then(({
        css: sassCSS,
        map: sassMap
      }) => mergeSourceMaps(postMap.toJSON(), JSON.parse(sassMap)).then(prev => {
        // update root to post-node-sass ast
        result.root = parse(sassCSS.toString(), Object.assign({}, postConfig, {
          map: {
            prev
          }
        }));
      }));
    }

  };
};

plugin.postcss = true;

module.exports = plugin;
