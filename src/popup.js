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
//yt transcript extrator
document.getElementById("testBtn").addEventListener("click", async () => {
    const debugDiv = document.getElementById("debugOutput");
    const inputBox = document.getElementById("inputBox"); // We will fill this automatically!
    
    debugDiv.innerText = "🕵️ Hunting for transcript...";

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: "getPageData" }, (response) => {
        if (chrome.runtime.lastError) {
            debugDiv.innerText = "Error: Refresh the YouTube page!";
            return;
        }

        if (response.status === "error") {
            debugDiv.innerText = "❌ " + response.message;
        } else {
            debugDiv.innerText = "✅ Transcript extracted!";
            
            // AUTO-FILL the text box with the transcript!
            inputBox.value = response.transcript;
            
            // Optional: Auto-click summarize if you want
            // document.getElementById("summarizeBtn").click();
        }
    });
});