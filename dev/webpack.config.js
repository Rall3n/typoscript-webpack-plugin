const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPluin = require('mini-css-extract-plugin');
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
                use: ['file-loader']
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new MiniCssExtractPluin(),
        new Self({
            outputPath: path.join(__dirname, 'dist'),
            loading: {
                customSource: path.join(__dirname, 'src/loading'),
                background: '#333'
            },
            typoScriptPublicPath: '/',
            typoScriptAdditionalDefaults: [
                'if.equals.data = levelfield:-2,backend_layout_next_level,slide',
                'if.equals.override.field = backend_layout'
            ]
        })
    ],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    }
};
