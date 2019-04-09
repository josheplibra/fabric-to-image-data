(function() {
  'use strict';

  var fs = require('fs');
  var path = require('path');
  var exec = require('child_process').exec;

  var libDir = path.join(__dirname, 'lib');
  var distDir = path.join(__dirname, 'dist');

  var outputFile = 'fabric-to-image-data.js';

  var build = [
    'fabric_to_image_data.mixin.js',
  ];

  /** @ignore */
  var readFile = function(filePath) {
    return new Promise(function(resolve, reject) {
      fs.readFile(path.join(libDir, filePath), function(error, data) {
        if (error) {
          return reject(error);
        }

        return resolve(data);
      });
    });
  };

  /** @ignore */
  var writeFile = function(filePath, contents) {
    return new Promise(function(resolve, reject) {
      fs.writeFile(path.join(distDir, filePath), contents, function(error) {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  };

  /** @ignore */
  var buildFiles = function() {
    return new Promise(function(resolve, reject) {
      if (!build.length) {
        return resolve();
      }

      /** @ignore */
      var onSuccess = function() {
        setTimeout(function() {
          // eslint-disable-next-line no-console
          resolve(pipedContents);
        }, 0);
      };

      /** @ignore */
      var onError = function(error) {
        reject(error);
      };

      /** @ignore */
      var onPipelineChain = function(contents) {
        pipedContents += String(contents) + '\n';
      };

      var pipedContents = '';

      var buildIndex = 0;
      var pipeline = readFile(build[buildIndex]).then(onPipelineChain);

      for (buildIndex = 1; buildIndex < build.length; ++buildIndex) {
        pipeline.then(readFile(build[buildIndex]).then(onPipelineChain));
      }

      pipeline
        .then(onSuccess)
        .catch(onError);
    });
  };

  /** @ignore */
  var writeBuild = function(contents) {
    return new Promise(function(resolve, reject) {
      /** @ignore */
      var onSuccess = function() {
        resolve();
      };

      /** @ignore */
      var onError = function(error) {
        reject(error);
      };

      writeFile(outputFile, contents)
        .then(onSuccess)
        .catch(onError);
    });
  };

  /** @ignore */
  var minifyBuild = function() {
    return new Promise(function(resolve, reject) {
      var outputExt = path.extname(outputFile);
      var outputName = path.basename(outputFile, outputExt);

      var srcPath = path.join(distDir, outputFile);
      var destPath = path.join(distDir, outputName + '.min' + outputExt);

      var flags = {
        'compress': null,
        'mangle': null,
        'output': destPath + ' ' + srcPath,
        'source-map': null
      };

      var command = 'uglifyjs ' + Object.keys(flags).map(function(key) {
        return '--' + key + (flags[key] ? ' ' + flags[key] : '');
      }).join(' ');

      exec(command, function(error) {
        if (error) {
          return reject(error);
        }

        resolve();
      });
    });
  };

  buildFiles()
    .then(writeBuild)
    .then(minifyBuild)
    .catch(function(error) {
      throw new Error(error);
    });
})();
