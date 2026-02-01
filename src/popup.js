
//transcript extrator
// src/popup.js

document.getElementById("testBtn").addEventListener("click", async () => {
    const debugDiv = document.getElementById("debugOutput");
    const inputBox = document.getElementById("inputBox");
    
    debugDiv.innerText = "🕵️ step 1: Finding Transcript URL...";

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 1. Ask Content Script for the URL
    chrome.tabs.sendMessage(tab.id, { action: "getPageData" }, (response) => {
        if (!response || response.status === "error") {
            debugDiv.innerText = "❌ Could not find caption URL.";
            return;
        }

        debugDiv.innerText = "⬇️ Step 2: Downloading text...";

        // 2. Ask Background Script to fetch the data
        chrome.runtime.sendMessage({ 
            action: "fetchTranscript", 
            url: response.transcriptUrl 
        }, (data) => {
            if (data.status === "success") {
                debugDiv.innerText = `✅ Success! Got ${data.transcript.length} chars.`;
                inputBox.value = data.transcript;
            } else {
                debugDiv.innerText = "❌ Download failed: " + data.message;
            }
        });
    });
});
//summarize logic
document.getElementById("summarizeBtn").addEventListener("click", () => {
    const text = document.getElementById("inputBox").value;
    const outputDiv = document.getElementById("output");

    if (!text) {
        outputDiv.innerText = "Please paste some text first!";
        return;
    }

    outputDiv.innerText = "⏳ AI is thinking... (First run takes ~30s)";

    // Send to Background Worker
    chrome.runtime.sendMessage({ action: "summarize", text: text }, (response) => {
        if (chrome.runtime.lastError) {
            outputDiv.innerText = "Error: " + chrome.runtime.lastError.message;
        } else if (response.status === "success") {
            outputDiv.innerText = response.summary;
        } else {
            outputDiv.innerText = "Error: " + response.message;
        }
    });
});