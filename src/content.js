// src/content.js
console.log("✅ Content Script Loaded!");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageData") {
        
        // 1. Get the raw page source
        const html = document.body.innerHTML;

        // 2. Use Regex to find the hidden "captionTracks" JSON
        // This looks for: "captionTracks":[{"baseUrl":"..."...}]
        const captionRegex = /"captionTracks":(\[.*?\])/;
        const match = html.match(captionRegex);

        if (!match) {
            sendResponse({ status: "error", message: "No captions found for this video." });
            return true;
        }

        try {
            // 3. Parse the JSON data we found
            const captionTracks = JSON.parse(match[1]);
            
            // 4. Find the English track (or just take the first one)
            // We prioritize English ('en'), but fallback to the first available if not found.
            const track = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
            const transcriptUrl = track.baseUrl;

            // 5. Fetch the actual transcript text (Async)
            fetchTranscript(transcriptUrl).then(transcriptText => {
                sendResponse({ 
                    status: "success", 
                    title: document.title, 
                    transcript: transcriptText 
                });
            });

        } catch (e) {
            sendResponse({ status: "error", message: "Failed to parse captions: " + e.message });
        }

        return true; // Keep connection open for async fetch
    }
});

// Helper function to fetch and clean the transcript
async function fetchTranscript(url) {
    const response = await fetch(url);
    const xmlText = await response.text();

    // The transcript comes as XML: <text start="10">Hello world</text>
    // We need to strip those tags to get just "Hello world"
    
    // Create a temporary DOM element to parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("text");

    // Combine all lines into one big string
    let fullText = "";
    for (let i = 0; i < textNodes.length; i++) {
        fullText += textNodes[i].textContent + " ";
    }
    
    return fullText.trim();
}