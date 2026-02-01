import { pipeline, env } from '@xenova/transformers';

// --- CONFIGURATION ---
env.allowLocalModels = true; // ✅ Enable local loading
env.allowRemoteModels = false; // ❌ Block internet loading
env.useBrowserCache = false;

env.localModelPath = '/';

// Point to local WASM (Engine)
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('/');
env.backends.onnx.wasm.numThreads = 1;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarize") {
        runSummarizer(request.text)
            .then(summary => sendResponse({ status: "success", summary: summary }))
            .catch(err => sendResponse({ status: "error", message: err.message }));
        return true;
    }
});

async function runSummarizer(text) {
    let generator = await pipeline('summarization', 'models', {
        quantized: false, 
        local_files_only: true, 
        use_merged: false 
    });

    let output = await generator(text, {
        max_new_tokens: 100,
        min_length: 30,
        do_sample: false, // "Greedy" search (fastest)

        // 👇 ADD THESE LINES TO FIX THE LOOP 👇
        no_repeat_ngram_size: 2, 
        repetition_penalty: 2.0 
    });

    return output[0].summary_text;
}