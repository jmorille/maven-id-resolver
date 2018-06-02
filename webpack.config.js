const path = require('path');

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
    entry: {
        index: './src/index',
        'maven-download': './src/maven-download'
    },
    target: "node",
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
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
        ]
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [
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
