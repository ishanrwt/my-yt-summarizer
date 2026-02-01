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
//to fetch transcript request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
 if (request.action === "fetchTranscript") {
        
        // 1. Get all cookies for YouTube
        chrome.cookies.getAll({ domain: "youtube.com" }, (cookies) => {
            
            // 2. Format them into a standard "Key=Value" string
            let cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");

            console.log("🍪 Sending Cookies to Python...");

            // 3. Send URL + Cookies to Python
            fetch('http://127.0.0.1:5000/get_transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    url: request.url,
                    cookies: cookieString // 👈 Sending the passport!
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    sendResponse({ status: "success", transcript: data.transcript });
                } else {
                    sendResponse({ status: "error", message: data.message });
                }
            })
            .catch(err => sendResponse({ status: "error", message: err.message }));
        });

        return true; // Keep connection open
    }
});