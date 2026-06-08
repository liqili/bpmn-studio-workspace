const webpack = require("webpack");

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // .bpmn file loader
            webpackConfig.module.rules.push({
                test: /\.bpmn$/,
                use: { loader: "raw-loader" },
            });

            // FIX: use process/browser.js (fully specified) not process/browser
            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    process: "process/browser.js", // <-- .js extension required for ESM
                })
            );

            // FIX: allow non-fully-specified imports from node_modules
            webpackConfig.module.rules.push({
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            });

            return webpackConfig;
        },
    },
};
