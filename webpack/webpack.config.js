const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src');
const distPath = path.join(__dirname, '..', 'example');

const stats = {
    // Add chunk information (setting this to `false` allows for a less verbose output)
    chunks: false,
    // Add the hash of the compilation
    hash: false,
    // `webpack --colors` equivalent
    colors: true,
    // Add information about the reasons why modules are included
    reasons: false,
    // Add webpack version information
    version: false,
};

module.exports = {
    context: sourcePath,
    devtool: 'source-map',
    entry: {
        main: [
            path.join(distPath, 'utils', 'polyfills.js'),
            path.join(distPath, 'main.js'),
        ],
    },
    output: {
        path: distPath,
        filename: '[name].js',
    },
    plugins: [],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: ['babel-loader'],
            },
        ],
    },
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
    },

    stats: stats,

    // https://webpack.js.org/configuration/dev-server/#devserver
    devServer: {
        contentBase: path.join(__dirname, '..', 'example'),
        watchContentBase: true,
        compress: true,
        hot: true,
        port: 4000,
        overlay: true,
        clientLogLevel: 'none',
        stats: stats,
    },
};
