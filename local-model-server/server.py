"""
Unified Local Server for YouTube Transcript Extraction and Summarization
Combines transcript fetching (yt-dlp) and local PyTorch model summarization

Usage:
    python server.py --model_path /path/to/your/fine-tuned-model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch
import yt_dlp
import os
import glob
import re

app = Flask(__name__)
CORS(app)  # Allow requests from browser extension

# Global variables for model and tokenizer
model = None
tokenizer = None
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def load_model(model_path):
    """Load the T5 model and tokenizer"""
    global model, tokenizer
    print(f"[*] Loading model from: {model_path}")
    print(f"[*] Using device: {device}")
    
    model = T5ForConditionalGeneration.from_pretrained(model_path)
    tokenizer = T5Tokenizer.from_pretrained(model_path)
    model.to(device)
    model.eval()  # Set to evaluation mode
    
    print("[OK] Model loaded successfully!")

def get_transcript_with_ytdlp(video_url):
    """Extract transcript from YouTube video using yt-dlp"""
    temp_filename = "temp_transcript"
    
    # Clean up old files
    for f in glob.glob(f"{temp_filename}*"):
        try: 
            os.remove(f)
        except: 
            pass

    ydl_opts = {
        'skip_download': True,
        'writesub': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'subtitlesformat': 'vtt',
        'outtmpl': temp_filename,
        'quiet': True,
        'no_warnings': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }

    # Use cookies.txt if available
    if os.path.exists('cookies.txt'):
        print("🍪 Found cookies.txt - Using it for authentication.")
        ydl_opts['cookiefile'] = 'cookies.txt'
    else:
        print("⚠️ Warning: No cookies.txt found. YouTube might block this request.")

    print("⏳ Downloading subtitle via yt-dlp...")
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.download([video_url])
        except Exception as e:
            raise Exception(f"Download failed: {str(e)}")

    files = glob.glob(f"{temp_filename}*.vtt")
    if not files:
        raise Exception("No English subtitles found for this video.")

    downloaded_file = files[0]
    print(f"✅ Reading file: {downloaded_file}")

    full_text = ""
    seen_lines = set()

    with open(downloaded_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
        for line in lines:
            clean_line = re.sub(r'<[^>]+>', '', line).strip()
            
            if (clean_line == "WEBVTT" or 
                clean_line == "" or 
                "-->" in line or 
                clean_line.startswith("Kind:") or
                clean_line.startswith("Language:")):
                continue

            if clean_line not in seen_lines:
                full_text += clean_line + " "
                seen_lines.add(clean_line)

    try: 
        os.remove(downloaded_file)
    except: 
        pass
    
    return full_text.strip()

# ==========================================
# API ENDPOINTS
# ==========================================

@app.route('/get_transcript', methods=['POST'])
def get_transcript():
    """Extract transcript from YouTube video"""
    data = request.json
    url = data.get('url')

    print(f"📥 Fetching transcript for: {url}")

    try:
        transcript = get_transcript_with_ytdlp(url)
        print(f"✅ Success! Extracted {len(transcript)} chars.")
        return jsonify({"status": "success", "transcript": transcript})

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/summarize', methods=['POST'])
def summarize():
    """Summarize text using the local PyTorch model"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'status': 'error',
                'message': 'No text provided'
            }), 400
        
        if model is None or tokenizer is None:
            return jsonify({
                'status': 'error',
                'message': 'Model not loaded'
            }), 500
        
        print(f"[*] Summarizing text ({len(text)} chars)...")
        
        # Prepare input with "summarize:" prefix for T5
        prompt = f"summarize: {text}"
        
        # Tokenize
        inputs = tokenizer.encode(
            prompt,
            return_tensors='pt',
            max_length=512,
            truncation=True
        ).to(device)
        
        # Generate summary
        with torch.no_grad():
            outputs = model.generate(
                inputs,
                max_length=150,
                min_length=30,
                do_sample=False,
                num_beams=4,
                no_repeat_ngram_size=3,
                repetition_penalty=2.0,
                early_stopping=True
            )
        
        # Decode the summary
        summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        print(f"[OK] Summary generated ({len(summary)} chars)")
        
        return jsonify({
            'status': 'success',
            'summary': summary
        })
    
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None
    })

# ==========================================
# MAIN
# ==========================================

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Unified Local Server for Transcripts and Summarization')
    parser.add_argument(
        '--model_path',
        type=str,
        default='C:/Users/Vikrant Negi/conversion_zone/model',
        help='Path to your fine-tuned T5 model'
    )
    parser.add_argument(
        '--port',
        type=int,
        default=5000,
        help='Port to run the server on (default: 5000)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Unified Local Server")
    print("=" * 60)
    
    # Load model
    load_model(args.model_path)
    
    print(f"\n[*] Starting server on http://127.0.0.1:{args.port}")
    print("[*] Endpoints:")
    print("    POST /get_transcript - Extract YouTube transcript")
    print("    POST /summarize - Summarize text using local model")
    print("    GET  /health - Health check")
    print("\n[*] Press Ctrl+C to stop\n")
    
    app.run(host='127.0.0.1', port=args.port, debug=False)
