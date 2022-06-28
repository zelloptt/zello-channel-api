const path = require('path');
const settings = require('./settings');
const TerserPlugin = require("terser-webpack-plugin");

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
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
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
        test: /\.worker\.js/,
        loader: 'workerize-loader',
        options: {
          inline: true
        }
      }
    ]
  }
};
