const path = require('path');
const settings = require('./settings');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const renameOutputPlugin = require('rename-output-webpack-plugin');

let entryFiles = {
  'Sdk': './src/classes/sdk.js',
  'Session': './src/classes/session.js',
  'Player': './src/classes/player.js',
  'Decoder': './src/classes/decoder.js',
  'Encoder': './src/classes/encoder.js',
  'Recorder': './src/classes/recorder.js',
  'Widget': './src/classes/widget/index.js',
  'Constants': './src/classes/constants.js',
  'IncomingMessage': './src/classes/incomingMessage.js',
  'OutgoingMessage': './src/classes/outgoingMessage.js'
};

let renameOutputFiles = {};
Object.keys(entryFiles).forEach(function(entryPoint) {
  renameOutputFiles[entryPoint] = 'zcc.' + entryPoint.toLowerCase() + '.js';
});

module.exports = {
  mode: 'production',
  entry: entryFiles,
  output: {
    filename: 'zcc.[name].js',
    library: [settings.libraryName, '[name]'],
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              'es2015'
            ]
          }
        }
      },
      {
        test: /\.ejs$/,
        use: {
          loader: 'ejs-compiled-loader',
          options: {
            htmlmin: true
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader"
        ]
      },
      {
        test: /inline/,
        use: {
          loader: 'raw-loader',
          options: {
            inline: true
          }
        }
      },
      {
        test: /\.worker\.js/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: true
          }
        }
      }
    ]
  },
  plugins: [
    new renameOutputPlugin(renameOutputFiles),
    new UglifyJsPlugin({
      uglifyOptions: {
        output: {
          comments: false,
          beautify: false
        }
      }
    })
  ]
};