const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const {WebpackManifestPlugin} = require('webpack-manifest-plugin');

const singleFile = process.env.SINGLE_FILE === 'true';
const external = process.env.EXTERNAL_MANIFEST === 'true';

module.exports = {
    cache: {
        buildDependencies: {
            config: [__filename]
        },
        type: 'filesystem'
    },
    devServer: {
        static: './dist'
    },
    devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map': false,
    entry: external ? './srv/external-manifest.js' : './srv/index.js',
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    module: {
        rules: [
            {
                test: /\.json$/i,
                type: 'json'
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Extracts to separate minified CSS file
                    MiniCssExtractPlugin.loader,
                    // Translates CSS into CommonJS
                    "css-loader",
                    // Compiles Sass to CSS
                    {
                        loader: "sass-loader",
                        options: {
                            sassOptions: {
                                quietDeps: true
                            }
                        }
                    }
                ]
            }
        ]
    },
    optimization: {
        moduleIds: 'deterministic',
        runtimeChunk: singleFile ? false : 'single',
        splitChunks: {
            minChunks: singleFile ? Number.MAX_SAFE_INTEGER : 1,
            minSize: singleFile ? Number.MAX_SAFE_INTEGER : 20 * 1024,
            cacheGroups: singleFile ? {default: false} : {
                data: {
                    chunks: 'all',
                    filename: '[name].[contenthash].js',
                    name: 'data',
                    type: 'json'
                },
                vendor: {
                    chunks: 'all',
                    name: 'vendors',
                    test: /[\\/]node_modules[\\/]/
                }
            }
        }
    },
    output: {
        clean: true,
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: ""
    },
    performance: {
        maxAssetSize: singleFile ? 1.75 * 1024 * 1024 : 1024 * 1024,
        maxEntrypointSize: 1.75 * 1024 * 1024
    },
    plugins: [
        new HtmlWebpackPlugin({
            cache: !singleFile,
            inject: !singleFile,
            meta: {
                "theme-color": "#002442",
                viewport: "width=device-width, initial-scale=1, shrink-to-fit=no"
            },
            template: singleFile ? '!!pug-loader!srv/single-file.pug' : 'auto',
            title: 'Top 2000'
        }),
        new MiniCssExtractPlugin({
            filename: process.env.NODE_ENV === 'development' ? '[name].css' :
                '[name].[contenthash].css'
        }),
        new WebpackManifestPlugin({
            filter: (file) => file.name !== "index.html"
        })
    ]
};
