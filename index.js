'use strict';

const fs = require('fs');
const path = require('path');
const pick = require('just-pick');
const merge = require('deepmerge');
const version = require('webpack').version;

/** internals */
const pluginDefaults = {
    filename: 'WebpackAssets.typoscript',
    typoScriptPublicPath: '/fileadmin/Resources/Public/',
    typoScriptRootPath: 'page',
    typoScriptIncludeTypeDefaults: {
        js: 'includeJSFooter',
        css: 'includeCSS'
    },
    chunks: null,
    loading: {
        type: 'default',
        background: '#2c3e50'
    },
    usePosix: true
};

const convertIncludeTypes = option => {
    if (typeof option === 'string') {
        option = { all: option };
    }

    return option;
};

const convertAdditionalTypoScript = option => {
    if (option) {
        if (typeof option === 'string') {
            option = {
                all: [option]
            };
        } else if (option instanceof Array) {
            option = {
                all: option
            };
        } else {
            ['all', 'js', 'css'].forEach(extension => {
                if (
                    option[extension] &&
                    typeof option[extension] === 'string'
                ) {
                    option[extension] = [option[extension]];
                }
            });
        }
    }

    return option;
};

const getChunkOptions = (chunk, options = {}, defaults = {}) => {
    if (options.includeTypes) {
        options.includeTypes = convertIncludeTypes(options.includeTypes);
    }
    if (options.additionalTypoScript) {
        options.additionalTypoScript = convertAdditionalTypoScript(
            options.additionalTypoScript
        );
    }

    if (options.files) {
        delete options.files;
    }
    if (defaults.files) {
        delete defaults.files;
    }

    chunk.files = Array.from(chunk.files);

    defaults = merge(defaults, pick(chunk, ['id', 'name', 'files']));

    return merge(defaults, options);
};

class TypoScriptPlugin {
    constructor(options = {}) {
        /** @todo BRAKING CHANGE: remove */
        pluginDefaults.loading = false;

        /** @todo BRAKING CHANGE: change to filename */
        const pluginOptions =
            typeof options === 'string' ? { outputPath: options } : options;

        /** @todo BRAKING CHANGE: set compiler.options.output.path as default output path */
        if (
            !pluginOptions.outputPath ||
            !path.isAbsolute(pluginOptions.outputPath)
        ) {
            pluginOptions.outputPath = path.dirname(module.parent.filename);
        }

        if (
            typeof pluginOptions.loading === 'boolean' &&
            pluginOptions.loading
        ) {
            pluginOptions.loading = {
                type: 'default',
                background: '#2c3e50'
            };
        } else if (typeof pluginOptions.loading === 'string') {
            pluginOptions.loading = {
                type: pluginOptions.loading,
                background: '#2c3e50'
            };
        }

        this.options = merge(pluginDefaults, pluginOptions);

        if (this.options.typoScriptIncludeTypeDefaults) {
            this.options.typoScriptIncludeTypeDefaults = convertIncludeTypes(
                this.options.typoScriptIncludeTypeDefaults
            );
        }
        if (this.options.typoScriptAdditionalDefaults) {
            this.options.typoScriptAdditionalDefaults =
                convertAdditionalTypoScript(
                    this.options.typoScriptAdditionalDefaults
                );
        }
    }

    generateTypoScript(chunk, options = {}) {
        options = getChunkOptions(chunk, options, {
            includeTypes: this.options.typoScriptIncludeTypeDefaults,
            additionalTypoScript: this.options.typoScriptAdditionalDefaults
        });

        const output = [];
        options.files.forEach(asset => {
            const assetOutput = [];
            const [, extension] = asset.match(/.*?(?:\.([^.]+))?$/);
            const name =
                options.customName || 'webpack_' + (options.name || options.id);

            if (!extension || !['js', 'css'].includes(extension)) {
                return;
            }

            assetOutput.push(
                name +
                    ' = ' +
                    path[this.options.usePosix ? 'posix' : 'win32'].join(
                        this.options.typoScriptPublicPath,
                        asset
                    )
            );

            const additionalTypoScript = [];
            if (options.additionalTypoScript) {
                if (options.additionalTypoScript.all) {
                    additionalTypoScript.push(
                        ...options.additionalTypoScript.all
                    );
                }
                if (options.additionalTypoScript[extension]) {
                    additionalTypoScript.push(
                        ...options.additionalTypoScript[extension]
                    );
                }
            }

            if (this.options.loading) {
                if (extension === 'css') {
                    additionalTypoScript.unshift(
                        'allWrap = <noscript class="webpack-plugin-defer">|</noscript>'
                    );
                } else if (extension === 'js') {
                    additionalTypoScript.unshift('async = 1');
                    additionalTypoScript.unshift('defer = 1');
                }
            }

            assetOutput.push(
                ...additionalTypoScript.map(
                    typoScript => name + '.' + typoScript.replace(/^\./, '')
                )
            );

            if (options.includeTypes) {
                if (options.includeTypes.all) {
                    output.push(
                        options.includeTypes.all + ' {',
                        ...assetOutput,
                        '}'
                    );
                }
                if (options.includeTypes[extension]) {
                    output.push(
                        options.includeTypes[extension] + ' {',
                        ...assetOutput,
                        '}'
                    );
                }
            }
        });

        return output.join('\n');
    }

    generateLoaderTypoScript(options = {}, compilation) {
        const localPath = path.join(__dirname, 'loading');
        const externalPath = [];
        if (
            typeof options.customSource === 'string' &&
            path.isAbsolute(options.customSource)
        ) {
            externalPath.push(options.customSource);
            if (options.type) {
                externalPath.push(type);
            }
        } else if (!options.type) {
            throw new Error(
                '[typoscript-webpack-plugin]: Either loading.type or loading.customSource must be defined'
            );
        }

        const publicPath = this.options.typoScriptPublicPath;
        const inputSrc = {
            js: fs.readFileSync(path.join(localPath, 'script.min.js'), 'utf8')
        };

        if (externalPath.length) {
            inputSrc.css = fs.readFileSync(
                path.join(...externalPath, 'style.css'),
                'utf8'
            );
        } else {
            inputSrc.css = fs.readFileSync(
                path.join(localPath, options.type, 'style.css'),
                'utf8'
            );
        }
        inputSrc.css = `
#webpack-plugin-loader {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10000;
    background: ${options.background};
    -webkit-transition: opacity 0.5s;
    transition: opacity 0.5s;
}

${inputSrc.css}
`;

        if (externalPath.length) {
            inputSrc.html = fs.readFileSync(
                path.join(...externalPath, 'template.html'),
                'utf8'
            );
        } else {
            inputSrc.html = fs.readFileSync(
                path.join(localPath, options.type, 'template.html'),
                'utf8'
            );
        }
        const typoScript = [];

        const scriptFilename = `webpack-loading.min.js`;
        const scriptPublicPath = path[
            this.options.usePosix ? 'posix' : 'win32'
        ].join(publicPath, scriptFilename);

        // emit js in a file
        this.emitAsset(compilation, scriptFilename, inputSrc.js);

        // include js in typoscript
        typoScript.push(
            'includeJSFooterlibs {',
            `webpack_loading = ${scriptPublicPath}`,
            'webpack_loading.excludeFromConcatenation = 1',
            'webpack_loading.async = 1',
            'webpack_loading.defer = 1',
            '}'
        );

        // include inline style in typoscript
        typoScript.push(
            'headerData {',
            '11389465 = TEXT',
            '11389465.value(',
            '<style type="text/css">',
            inputSrc.css
                .replace(/^\s*|\s*([{};])\s*|\s*$/g, '$1')
                .replace(/(\s)\s+/g, '$1'),
            '</style>',
            ')',
            '}'
        );

        // include html template in typoscript
        typoScript.push(
            'footerData {',
            '11389465 = TEXT',
            '11389465.value(',
            '<div id="webpack-plugin-loader">',
            inputSrc.html.replace(/^\s*|\s*$/g, '').replace(/(\s)\s+/g, '$1'),
            '</div>',
            ')',
            '}'
        );

        return typoScript;
    }

    emitTypoScript(compilation, callback) {
        const outputLines = [];
        const compilationChunks = Array.from(compilation.chunks);
        if (this.options.chunks) {
            this.options.chunks.forEach(chunkOptions => {
                if (typeof chunkOptions === 'string') {
                    chunkOptions = { name: chunkOptions };
                }

                const chunk = compilationChunks.find(chunk =>
                    chunkOptions.id
                        ? chunkOptions.id === chunk.id
                        : chunkOptions.name === chunk.name
                );
                outputLines.push(this.generateTypoScript(chunk, chunkOptions));
            });
        } else {
            outputLines.push(
                ...compilationChunks.map(chunk =>
                    this.generateTypoScript(chunk)
                )
            );
        }

        if (this.options.loading) {
            outputLines.push(
                ...this.generateLoaderTypoScript(
                    this.options.loading,
                    compilation
                )
            );
        }

        const output = [
            this.options.typoScriptRootPath + ' {',
            ...outputLines,
            '}'
        ].join('\n');

        const outputPath = path.join(
            path.relative(
                compilation.options.output.path,
                this.options.outputPath
            ),
            this.options.filename
        );

        this.emitAsset(compilation, outputPath, output);

        callback && callback();
    }

    apply(compiler) {
        if (!version.startsWith('5')) {
            compiler.hooks.emit.tapAsync(
                'TypoScriptPlugin',
                (compilation, callback) =>
                    this.emitTypoScript(compilation, callback)
            );
        } else {
            compiler.hooks.thisCompilation.tap(
                'TypoScriptPlugin',
                compilation =>
                    compilation.hooks.processAssets.tapAsync(
                        {
                            name: 'TypoScriptPlugin',
                            stage: compiler.webpack.Compilation
                                .PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
                        },
                        (compilationAssets, callback) =>
                            this.emitTypoScript(compilation, callback)
                    )
            );
        }
    }

    /**
     * @param {string} filename
     * @param {string} content
     */
    emitAsset(compilation, filename, content) {
        if (!version.startsWith('5')) {
            compilation.assets[filename] = {
                source: () => content,
                size: () => content.length
            };
        } else {
            const { RawSource } = compilation.compiler.webpack.sources;

            compilation.emitAsset(filename, new RawSource(content), {
                size: content.length
            });
        }
    }
}

module.exports = TypoScriptPlugin;
