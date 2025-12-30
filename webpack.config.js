import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import WebpackFavicons from 'webpack-favicons';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';

const outputPublicPath = process.env.OUTPUT_PUBLIC_PATH || '';
const singleFile = process.env.SINGLE_FILE === 'true';
const external = process.env.EXTERNAL_MANIFEST === 'true';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const anchors = new Map();

const config = {
    cache: {
        buildDependencies: {
            config: [__filename]
        },
        type: 'filesystem'
    },
    devServer: {
        static: './dist',
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, Content-Type, Authorization"
        }
    },
    devtool: process.env.NODE_ENV === 'development' ? 'eval-source-map' : false,
    entry: external ? './srv/external-manifest.js' : './srv/index.js',
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    module: {
        rules: [
            {
                test: /\.json$/i,
                type: 'json'
            },
            {
                test: /\.md$/i,
                use: [
                    "html-loader",
                    {
                        loader: "markdown-loader",
                        options: {
                            extensions: {
                                renderers: {
                                    heading({ tokens, raw, depth }) {
                                        let text = this.parser.parseInline(tokens);
                                        const found = text.match(/(?<version>.+)(?: - (?<date>[\d-]+))?/);
                                        if (found) {
                                            text = found.groups.date ?
                                                `${found.groups.version} - <time>${found.groups.date}</time>` :
                                                found.groups.date;
                                        }
                                        let anchor = raw.toLowerCase()
                                            .replace(/(?: -|:) .*/, '')
                                            .replace(/[^\w]+/g, ' ')
                                            .trim()
                                            .replace(/ /g, '-');
                                        if (/^\d/.test(anchor)) {
                                            anchor = `v${anchor}`;
                                        }
                                        while (anchors.has(anchor)) {
                                            const count = anchors.get(anchor);
                                            anchors.set(anchor, count + 1);
                                            anchor = `${anchor}-${count}`;
                                        }
                                        anchors.set(anchor, 1);
                                        return `
                                        <h${depth} class="anchor-title" id="${anchor}">
                                            <a class="anchor-link" href="#${anchor}">
                                                ${String.fromCodePoint(0x1f517)}
                                            </a>
                                            ${text}
                                        </h${depth}>`;
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Extract to separate minified CSS file
                    MiniCssExtractPlugin.loader,
                    // Translate CSS into CommonJS
                    "css-loader",
                    // Compile Sass to CSS
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
            cacheGroups: singleFile ? { default: false } : {
                data: {
                    chunks: 'all',
                    filename: '[name].[contenthash].js',
                    name: 'data',
                    test: /output-sorted\.json/,
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
        clean: process.env.NODE_ENV !== 'development',
        filename: '[name].[contenthash].js',
        path: resolve(__dirname, 'dist'),
        publicPath: outputPublicPath
    },
    performance: {
        maxAssetSize: singleFile ? 1.75 * 1024 * 1024 : 1024 * 1024,
        maxEntrypointSize: 1.75 * 1024 * 1024
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "schema/*.json"
                }
            ]
        }),
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
        new WebpackFavicons({
            appName: 'Top 2000',
            appDescription: 'NPO Radio 2 Top 2000 chart viewer',
            background: '#000000',
            path: '',
            src: 'srv/logo.svg',
            start_url: outputPublicPath,
            theme_color: '#002442',
            icons: {
                android: true,
                appleIcon: true,
                favicons: true
            }
        }),
        new WebpackManifestPlugin({
            filter: (file) => file.name !== "index.html" &&
                !file.name.startsWith("schema/")
        })
    ],
    resolve: {
        alias: {
            "@output": resolve(__dirname)
        }
    },
    watchOptions: {
        ignored: ['**/.git', '**/dist', '**/node_modules', '**/top2000/**/*.py']
    }
};
export default config;
