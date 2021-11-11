const path = require('path');
const fs = require('fs');

const MiniCssExtractPluin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-manifest-plugin').WebpackManifestPlugin;
const EventHooksPlugin = require('event-hooks-webpack-plugin');
const replaceLoader = require('./insert-template');
const Self = require('..');

module.exports = {
    context: __dirname,
    entry: './src/index.js',
    mode: 'development',
    module: {
        rules: [
            {
                test: /.css$/,
                use: [MiniCssExtractPluin.loader, 'css-loader']
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
        new MiniCssExtractPluin(),
        new Self({
            outputPath: path.join(__dirname, 'dist', 'typoscript'),
            loading: {
                customSource: path.join(__dirname, 'src', 'loading'),
                background: '#333'
            },
            typoScriptPublicPath: '/'
        }),
        new EventHooksPlugin({
            done: () => {
                const content = fs.readFileSync(
                    path.resolve(__dirname, 'src', 'index.html')
                );

                fs.writeFileSync(
                    path.resolve(__dirname, 'dist', 'index.html'),
                    replaceLoader(content)
                );
            }
        }),
        new ManifestPlugin()
    ],
    output: {
        filename: 'bundle.js',
        path: path.join(__dirname, 'dist', 'assets'),
        clean: true
    }
};
