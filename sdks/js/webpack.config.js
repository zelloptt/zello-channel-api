const path = require('path');
const settings = require('./settings');
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack');

let entryFiles = {
  'Sdk': './src/classes/sdk.js',
  'Session': './src/classes/session.js',
  'Player': './src/classes/player.js',
  'Decoder': './src/classes/decoder.js',
  'Encoder': './src/classes/encoder.js',
  'Recorder': './src/classes/recorder.js',
  'Widget': './src/classes/widget/index.js',
  'Constants': './src/classes/constants.js',
  'IncomingImage': './src/classes/incomingImage.js',
  'OutgoingImage': './src/classes/outgoingImage.js',
  'IncomingMessage': './src/classes/incomingMessage.js',
  'OutgoingMessage': './src/classes/outgoingMessage.js'
};

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_NODE_ENV_DEVELOPMENT = NODE_ENV === 'development';
const IS_NODE_ENV_PRODUCTION = NODE_ENV === 'production';

module.exports = {
  mode: 'production',
  optimization: {
    minimize: IS_NODE_ENV_PRODUCTION,
    minimizer: [
      new TerserPlugin({
      extractComments: false,
      terserOptions: {
        format: {
          comments: false,
        },
      },
    })],
  },
  entry: entryFiles,
  devtool: IS_NODE_ENV_DEVELOPMENT ? 'source-map' : false,
  output: {
    clean: true,
    filename: (pathData) => {
      return 'zcc.' + pathData.chunk.name.toLowerCase() + '.js';
    },
    library: [settings.libraryName, '[name]'],
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      },
      {
        test: /\.js$/,
        exclude: [/node_modules/, /\.worker\.js$/],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env'
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
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader"
        ]
      },
      {
        test: /inline/,
        type: 'asset/source'
      },
      {
        // Load .worker.js files as raw strings so the importing module can
        // manage the Blob URL lifecycle itself (create -> new Worker(url) ->
        // revokeObjectURL). Previously this rule used workerize-loader with
        // `inline: true`, whose generated wrapper interpolated the blob URL
        // expression twice and leaked one URL per constructed Worker.
        test: /\.worker\.js$/,
        type: 'asset/source'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require("./package.json").version),
    }),
  ],
};
