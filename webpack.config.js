const path = require('path');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const singleFile = process.env.SINGLE_FILE === 'true';

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
    entry: './srv/index.js',
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
                    "sass-loader"
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
        maxAssetSize: 1024 * 1024,
        maxEntrypointSize: 1.75 * 1024 * 1024
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "output-sorted.json",
                    to: "output-sorted.json"
                }
            ]
        }),
        new HtmlWebpackPlugin({
            cache: !singleFile,
            inject: !singleFile,
            meta: {
                viewport: "width=device-width, initial-scale=1, shrink-to-fit=no"
            },
            template: singleFile ? '!!pug-loader!srv/single-file.pug' : 'auto',
            title: 'Top 2000'
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css'
        })
    ]
};
