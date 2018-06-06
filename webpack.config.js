const path = require('path');

const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
//

module.exports = {
    entry: {
        'cli': './src/cli',
        'main': './src/main',
        'index': './src/index',
        'maven-download': './src/maven-download'
    },
    target: "node",

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: "mavenIdResolver",
        libraryTarget: 'commonjs2'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/,
                options: {
                    happyPackMode: true,
                    transpileOnly: true
                }
            },
            { test: /\.jsx?$/,loader: 'shebang-loader', exclude: /node_modules/ },
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [
        new webpack.BannerPlugin({ banner: '#!/usr/bin/env node',  raw: true }),
        new ForkTsCheckerWebpackPlugin()
    ],
    optimization: {
        splitChunks: {
            chunks: 'async',
            minChunks: 1
        },
        namedModules: true,
        namedChunks: true
    }
}
