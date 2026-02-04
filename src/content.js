// src/content.js
console.log("✅ Content Script Loaded");

// 1. Variable to track if we already injected the UI
let isUIInjected = false;

// 2. The Main Injection Logic
function injectSummaryUI() {
    // We want to inject into the "Secondary" column (right sidebar)
    const secondaryColumn = document.querySelector('#secondary-inner');
    const existingUI = document.querySelector('.yt-summary-container');

    // If sidebar exists but our UI doesn't, let's build it!
    if (secondaryColumn && !existingUI) {
        
        // --- Create the Container ---
        const container = document.createElement('div');
        container.className = 'yt-summary-container';
        
        // --- Create the Header & Button ---
        container.innerHTML = `
            <div class="yt-summary-header">
                <span class="yt-summary-title">AI Summary</span>
                <button id="yt-gen-btn" class="yt-summary-btn">Summarize</button>
            </div>
            <div id="yt-loading" class="yt-loader"></div>
            <div id="yt-summary-text" class="yt-summary-content"></div>
        `;

        // --- Insert at the TOP of the sidebar ---
        secondaryColumn.insertBefore(container, secondaryColumn.firstChild);
        isUIInjected = true;

        // --- Add Event Listener ---
        document.getElementById('yt-gen-btn').addEventListener('click', handleSummarizeClick);
    }
}

// 3. Handle the Button Click
async function handleSummarizeClick() {
    const btn = document.getElementById('yt-gen-btn');
    const loader = document.getElementById('yt-loading');
    const contentDiv = document.getElementById('yt-summary-text');

    // UI State: Loading
    btn.disabled = true;
    btn.innerText = "Thinking...";
    loader.style.display = 'block';
    contentDiv.innerText = "";

    const videoUrl = window.location.href;

    try {
        // Step A: Fetch Transcript (Calls Background -> Python)
        const transcriptResponse = await sendMessageToBackground({ 
            action: "fetchTranscript", 
            url: videoUrl 
        });

        if (transcriptResponse.status === "error") {
            throw new Error(transcriptResponse.message);
        }

        contentDiv.innerText = "Reading transcript... (This might take a moment)";

        // Step B: Summarize (Calls Background -> ONNX)
        const summaryResponse = await sendMessageToBackground({
            action: "summarize",
            text: transcriptResponse.transcript
        });

        if (summaryResponse.status === "error") {
            throw new Error(summaryResponse.message);
        }

        // Success!
        contentDiv.innerText = summaryResponse.summary;

    } catch (err) {
        contentDiv.innerText = "❌ Error: " + err.message;
    } finally {
        // UI State: Reset
        btn.disabled = false;
        btn.innerText = "Summarize";
        loader.style.display = 'none';
    }
}

// 4. Helper to talk to Background.js (Promisified)
function sendMessageToBackground(payload) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(payload, (response) => {
            resolve(response);
        });
    });
}

// 5. Watch for Page Changes (YouTube is a Single Page App)
// This ensures our button comes back if you click a new video
const observer = new MutationObserver(() => {
    injectSummaryUI();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial Try
injectSummaryUI();