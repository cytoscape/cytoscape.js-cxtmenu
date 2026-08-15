'use strict';

const path = require('node:path');

const pkg = require('./package.json');

const isProduction =
  process.env.NODE_ENV === 'production';

const isMinified =
  process.env.MIN === 'true';

module.exports = {
  mode: isProduction
    ? 'production'
    : 'development',

  entry: path.resolve(
    __dirname,
    'src',
    'index.js'
  ),

  devtool: isProduction
    ? 'source-map'
    : 'eval-source-map',

  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },

  output: {
    path: __dirname,
    filename: isMinified
      ? `${pkg.name}.min.js`
      : `${pkg.name}.js`,
    library: {
      name: 'cytoscapeCxtmenu',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this'
  },

  devServer: {
    static: {
      directory: __dirname
    },
    hot: true,
    open: true
  }
};
