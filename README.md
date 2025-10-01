# Real‑Time Transcription Demo (Static Site)

This is a zero‑backend static website you can deploy on **Vercel**. It plays an MP3 and **simulates** real‑time transcription using a transcript you provide (either a plain text file or JSON with word‑level timestamps).

## Quick Start (Local)
1. Put your audio at `assets/demo.mp3` (or use the file picker on the page).
2. Put your transcript at `assets/transcript.txt` (plain text) **or** `assets/transcript.json` (word‑level timestamps optional).
3. Open `index.html` in a browser.

## Deploy to Vercel
1. Create a new Git repo and add these files.
2. Push to GitHub/GitLab/Bitbucket.
3. In Vercel, **New Project → Import** your repo → Framework Preset: **Other** (static).
4. Build Command: _none_ • Output Directory: `/` (root).
5. After deploy, upload:
   - `assets/demo.mp3`
   - `assets/transcript.txt` **or** `assets/transcript.json`

> You can also drag & drop via the page’s file pickers, but placing files in `/assets` makes it work out‑of‑the‑box.

## Transcript Formats
- **Plain text** (`assets/transcript.txt`): words are revealed evenly over the audio duration.
- **JSON** (`assets/transcript.json`):
  ```json
  {
    "words": [
      { "text": "Hello", "start": 0.10, "end": 0.35 },
      { "text": "world", "start": 0.36, "end": 0.60 }
    ]
  }
  ```
  or simply:
  ```json
  [
    { "text": "Hello", "start": 0.10, "end": 0.35 },
    { "text": "world", "start": 0.36, "end": 0.60 }
    ]
  ```
  If timestamps are present, the page will sync to them. Otherwise it will spread tokens evenly across the track length.

## Notes
- No data leaves the browser—everything runs client‑side.
- Seeking, pausing, playback speed, and restart are supported.
- The “current” token is highlighted and auto‑scrolled into view.
