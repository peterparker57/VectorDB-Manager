const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

const commonConfig = {
  mode: isDevelopment ? 'development' : 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.mjs'],
    fallback: {
      "path": false,
      "fs": false,
      "crypto": false
    }
  },
  devtool: isDevelopment ? 'source-map' : false,
};

const mainConfig = {
  ...commonConfig,
  target: 'electron-main',
  entry: './src/main/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/main'),
  },
  experiments: {
    topLevelAwait: true
  },
  externalsPresets: { node: true },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'hnswlib-node': 'commonjs hnswlib-node',
    'sharp': 'commonjs sharp',
    'electron': 'commonjs electron'
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: path.resolve(__dirname, 'src/main/sql'),
          to: path.resolve(__dirname, 'dist/sql'),
          noErrorOnMissing: false
        }
      ],
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
  },
};

const preloadConfig = {
  ...commonConfig,
  target: 'electron-preload',
  entry: './src/main/preload.ts',
  output: {
    filename: 'preload.js',
    path: path.resolve(__dirname, 'dist/main'),
  },
  externals: {
    'electron': 'commonjs electron'
  }
};

const rendererConfig = {
  ...commonConfig,
  target: 'web',
  entry: './src/renderer/index.tsx',
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist/renderer'),
    publicPath: './'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html'),
      filename: 'index.html',
      inject: true,
      minify: !isDevelopment,
      publicPath: './'
    })
  ],
  resolve: {
    ...commonConfig.resolve,
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom')
    }
  }
};

module.exports = (env) => {
  if (env.target === 'main') {
    return mainConfig;
  } else if (env.target === 'preload') {
    return preloadConfig;
  } else {
    return rendererConfig;
  }
};