// src/content.js
console.log("✅ Content Script Ready");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageData") {
        // Just send the current URL. Python handles the rest.
        sendResponse({ 
            status: "success", 
            transcriptUrl: window.location.href 
        });
    }
    return true;
});