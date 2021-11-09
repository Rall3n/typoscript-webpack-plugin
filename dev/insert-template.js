const fs = require('fs');
const path = require('path');

const loaderPattern = /<div id="webpack-plugin-loader">[\s\S]+<\/div>/;
const stylePattern = /<style type="text\/css">([\s\S]*)<\/style>/;
const loaderReplacePattern = /<div id="webpack-plugin-loader"><\/div>/;
const styleReplacePattern = /(<style id="webpack-plugin-style">)(<\/style>)/;

/** @param {Buffer|String} content */
const replaceLoader = content => {
    const input = fs.readFileSync(
        path.join(__dirname, 'dist', 'typoscript', 'WebpackAssets.typoscript'),
        'utf8'
    );

    const [template] = input.match(loaderPattern);
    const [, style] = input.match(stylePattern);

    return content
        .toString()
        .replace(loaderReplacePattern, template)
        .replace(styleReplacePattern, `$1${style}$2`);
};

module.exports = replaceLoader;
