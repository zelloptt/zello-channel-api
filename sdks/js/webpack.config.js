const path = require('path');
const webpack = require('webpack');
const settings = require('./settings');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    'Sdk': './src/classes/sdk.js',
    'Session': './src/classes/session.js',
    'Player': './src/classes/player.js',
    'Recorder': './src/classes/recorder.js',
    'Widget': './src/classes/widget/index.js'
  },
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
        test: /\.handlebars$/,
        loader: 'handlebars-loader'
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