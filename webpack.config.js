const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    
    // 1. ENTRY POINTS
    // We removed 'popup' because you are now using the Sidebar (content.js)
    entry: {
        background: './src/background.js',
        content: './src/content.js', 
    },
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true, // ✨ Auto-cleans the dist folder before building
    },
    
    plugins: [
        new CopyPlugin({
            patterns: [
                // ➤ Manifest & Icons
                { from: "manifest.json", to: "manifest.json" },
                { from: "icons", to: "icons" },

                // ➤ UI Styles (CRITICAL: You forgot this!) 🎨
                { from: "src/styles.css", to: "styles.css" },

                // ➤ AI Engine (WASM)
                { from: "node_modules/@xenova/transformers/dist/*.wasm", to: "[name][ext]" },

                // ➤ AI Brain (Your ONNX Models) 🧠
                // This fixes the "file not found" error
                { from: "src/models", to: "models" } 
            ],
        }),
    ],
};