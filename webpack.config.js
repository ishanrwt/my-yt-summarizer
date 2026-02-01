const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        background: './src/background.js',
        popup: './src/popup.js',
        content: './src/content.js',//to extract the yt
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
   plugins: [
        new CopyPlugin({
            patterns: [
                { from: "src/popup.html", to: "popup.html" },
                { from: "manifest.json", to: "manifest.json" },
                { from: "icons", to: "icons" },
                { from: "node_modules/@xenova/transformers/dist/*.wasm", to: "[name][ext]" },
                // 👇 ADD THIS LINE: Copy the model files to the final build
                { from: "src/models", to: "models" } 
            ],
        }),
    ],
};