// ==========================================
// 1. CONFIGURATION
// ==========================================
// Using local Python server for summarization (no ONNX needed!)
// The model runs on your local machine via PyTorch

// ==========================================
// 2. THE UNIFIED LISTENER
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // ➤ CASE A: Fetch Transcript (Uses Python Server)
    if (request.action === "fetchTranscript") {
        console.log("📥 Fetching transcript for:", request.url);
        handleTranscriptFetch(request.url, sendResponse);
        return true; // Keep connection open for async response
    }

    // ➤ CASE B: Summarize (Uses Local Python Server with PyTorch Model)
    if (request.action === "summarize") {
        console.log("🧠 Starting AI Summarization via Python server...");
        runSummarizer(request.text)
            .then(summary => {
                console.log("✅ Summary Complete");
                sendResponse({ status: "success", summary: summary });
            })
            .catch(err => {
                console.error("❌ Summarization Error:", err);
                sendResponse({ 
                    status: "error", 
                    message: "Is the Python model server running? " + err.message 
                });
            });
        return true; // Keep connection open
    }
});

// ==========================================
// 3. CORE FUNCTIONS
// ==========================================

// --- The Python Fetcher ---
function handleTranscriptFetch(videoUrl, sendResponse) {
    // Call the unified Python Server (handles both transcript and summarization)
    // Note: The server uses cookies.txt file, so we don't need to send cookies from browser
    fetch('http://127.0.0.1:5000/get_transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            url: videoUrl
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
    .catch(err => {
        sendResponse({ 
            status: "error", 
            message: "Is the Python Server running? " + err.message 
        });
    });
}

// --- The Local AI Summarizer (Python Server) ---
// ==========================================
// THE CHUNKING SUMMARIZER (Calls Local Python Server)
// ==========================================
// Uses your local PyTorch model via Python server (no ONNX conversion needed!)

async function runSummarizer(text) {
    // 1. The Chunking Config
    // 2500 characters is roughly ~500-600 tokens (safe limit for T5)
    const chunkSize = 2500; 
    let chunks = [];
    
    // 2. Slice the text
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }

    console.log(`🧩 Split text into ${chunks.length} chunks.`);
    let fullSummary = [];

    // 3. Loop and Summarize via Python Server
    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];
        console.log(`   -> Processing Chunk ${i + 1}/${chunks.length}...`);

        try {
            // Call the unified Python server (same server as transcript)
            const response = await fetch('http://127.0.0.1:5000/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: chunk })
            });

            const data = await response.json();

            if (data.status === 'error') {
                throw new Error(data.message);
            }

            let summaryText = data.summary.trim();
            fullSummary.push(summaryText);
            console.log(`   ✅ Chunk ${i + 1} summarized (${summaryText.length} chars)`);

        } catch (e) {
            console.warn(`⚠️ Error on chunk ${i}:`, e);
            throw new Error(`Failed to summarize chunk ${i + 1}: ${e.message}`);
        }
    }

    // 4. Join them into one long string
    return fullSummary.join("\n\n");
}