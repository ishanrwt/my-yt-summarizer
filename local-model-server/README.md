# Unified Local Server

This server combines:
1. **YouTube transcript extraction** (using yt-dlp with cookies.txt)
2. **Text summarization** (using your local fine-tuned PyTorch T5 model)

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Place your cookies.txt file** in the `local-model-server/` folder
   - This file is used for YouTube authentication
   - Export it from your browser using an extension like "Get cookies.txt LOCALLY"

## Usage

### Start the server:

```bash
python server.py --model_path "C:/Users/Vikrant Negi/conversion_zone/model"
```

Or with custom port:
```bash
python server.py --model_path "C:/Users/Vikrant Negi/conversion_zone/model" --port 5000
```

### Server Endpoints:

- **POST /get_transcript** - Extract YouTube transcript
  ```json
  {
    "url": "https://www.youtube.com/watch?v=..."
  }
  ```

- **POST /summarize** - Summarize text using local model
  ```json
  {
    "text": "Your text to summarize here..."
  }
  ```

- **GET /health** - Health check (returns model status)

## How It Works

1. **Transcript Extraction:**
   - Uses yt-dlp to download subtitles from YouTube
   - Uses cookies.txt for authentication (if available)
   - Returns clean transcript text

2. **Summarization:**
   - Loads your fine-tuned T5 PyTorch model
   - Runs inference locally on your machine
   - Returns summarized text

## Benefits

- ✅ **Single server** - Everything in one place
- ✅ **No ONNX conversion** - Uses original PyTorch model
- ✅ **Uses cookies.txt** - Same authentication as your original script
- ✅ **Local processing** - Everything runs on your machine
- ✅ **Simpler setup** - One server to manage

## Troubleshooting

### "No cookies.txt found"
- Make sure `cookies.txt` is in the `local-model-server/` folder
- Export it from your browser if you don't have it

### "Model not loaded"
- Check that the `--model_path` points to your model directory
- Verify the model files are present (config.json, pytorch_model.bin, etc.)

### Port already in use
- Change the port: `--port 5001`
- Or stop any other service using port 5000
