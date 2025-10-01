// Real-time transcription illusion.
// Strategy:
// - We already have a transcript (.txt or .json).
// - When audio plays, we reveal tokens over time so it *looks* live.
// - If we have a JSON with timestamps per word, we'll honor them. Otherwise we spread tokens across duration.

const player = document.getElementById('player');
const playPauseBtn = document.getElementById('playPause');
const restartBtn = document.getElementById('restart');
const speedSel = document.getElementById('speed');
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const transcriptContainer = document.getElementById('transcriptContainer');
const audioFileInput = document.getElementById('audioFile');
const transcriptFileInput = document.getElementById('transcriptFile');
const loadDefaultsBtn = document.getElementById('loadDefaults');

let tokens = [];          // [{text, t0(optional), t1(optional)}]
let revealIndex = 0;      // next token to reveal
let rafId = null;
let lastCurrentIdx = -1;

function fmt(sec) {
  if (!isFinite(sec)) return '00:00';
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function setStatus(mode) {
  statusEl.classList.remove('idle','playing','paused');
  statusEl.classList.add(mode);
  statusEl.textContent = mode === 'playing' ? 'Transcribing…' : mode === 'paused' ? 'Paused' : 'Idle';
}

function resetTranscript() {
  transcriptContainer.innerHTML = '';
  tokens.forEach((tk, i) => {
    const span = document.createElement('span');
    span.textContent = (i ? ' ' : '') + tk.text;
    span.className = 'token';
    transcriptContainer.appendChild(span);
    tk._el = span;
  });
  revealIndex = 0;
  lastCurrentIdx = -1;
  updateVisible(0);
}

function updateVisible(currentTime) {
  // Determine how many tokens should be visible at currentTime.
  let visibleCount = 0;
  if (tokens.length === 0) return;

  if (tokens[0].t0 != null) {
    // Timestamped tokens
    while (visibleCount < tokens.length && tokens[visibleCount].t0 <= currentTime) visibleCount++;
  } else {
    const dur = player.duration || 0;
    const pct = dur ? currentTime / dur : 0;
    visibleCount = Math.floor(tokens.length * pct);
  }

  // Reveal tokens up to visibleCount
  for (let i = revealIndex; i < visibleCount; i++) {
    tokens[i]._el.classList.add('visible');
  }
  revealIndex = Math.max(revealIndex, visibleCount);

  // Highlight the current token (closest to now)
  const idx = Math.min(visibleCount, tokens.length - 1);
  if (idx !== lastCurrentIdx) {
    if (lastCurrentIdx >= 0 && tokens[lastCurrentIdx]?._el) {
      tokens[lastCurrentIdx]._el.classList.remove('current');
    }
    if (tokens[idx]?._el) tokens[idx]._el.classList.add('current');
    lastCurrentIdx = idx;
    // Auto-scroll to keep current token in view
    const el = tokens[idx]._el;
    const rect = el.getBoundingClientRect();
    const parentRect = transcriptContainer.getBoundingClientRect();
    if (rect.bottom > parentRect.bottom - 20 || rect.top < parentRect.top + 20) {
      transcriptContainer.scrollTop = el.offsetTop - transcriptContainer.clientHeight / 2;
    }
  }
}

function tick() {
  timeEl.textContent = `${fmt(player.currentTime)} / ${fmt(player.duration)}`;
  updateVisible(player.currentTime);
  rafId = requestAnimationFrame(tick);
}

function stopTick() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

player.addEventListener('play', () => {
  playPauseBtn.textContent = 'Pause';
  playPauseBtn.disabled = false;
  restartBtn.disabled = false;
  setStatus('playing');
  stopTick();
  rafId = requestAnimationFrame(tick);
});

player.addEventListener('pause', () => {
  playPauseBtn.textContent = 'Play';
  setStatus('paused');
  stopTick();
});

player.addEventListener('seeking', () => {
  // When the user seeks, recompute visibility for the new time
  setTimeout(() => updateVisible(player.currentTime), 0);
});

player.addEventListener('loadedmetadata', () => {
  timeEl.textContent = `${fmt(0)} / ${fmt(player.duration)}`;
});

speedSel.addEventListener('change', () => {
  player.playbackRate = parseFloat(speedSel.value);
});

playPauseBtn.addEventListener('click', () => {
  if (player.paused) player.play(); else player.pause();
});

restartBtn.addEventListener('click', () => {
  player.currentTime = 0;
  transcriptContainer.scrollTop = 0;
  resetTranscript();
  if (player.paused) player.play();
});

audioFileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  player.src = url;
  playPauseBtn.disabled = false;
  restartBtn.disabled = false;
  setStatus('paused');
});

transcriptFileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  parseTranscript(text);
  resetTranscript();
});

function parseTranscript(text) {
  tokens = [];
  try {
    const data = JSON.parse(text);
    // Accept formats:
    // { words: [{text:"hello", start:0.10, end:0.30}, ...] }
    // or [{text:"hello", start:..., end:...}, ...]
    const arr = Array.isArray(data) ? data : (data.words || []);
    tokens = arr.map(w => ({
      text: String(w.text ?? w.word ?? ''),
      t0: typeof w.start === 'number' ? w.start : (typeof w.t0 === 'number' ? w.t0 : null),
      t1: typeof w.end === 'number' ? w.end   : (typeof w.t1 === 'number' ? w.t1 : null),
    })).filter(w => w.text.length);
  } catch {
    // Treat as plain text; split into tokens
    const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    tokens = words.map(w => ({ text: w }));
  }
}

async function loadDefaults() {
  // Attempt to load /assets/transcript.json or /assets/transcript.txt
  const tryFetch = async (path) => {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error('not ok');
      return await res.text();
    } catch { return null; }
  };

  let audioUrl = 'assets/demo.mp3';
  player.src = audioUrl;

  let txt = await tryFetch('assets/transcript.json');
  if (!txt) txt = await tryFetch('assets/transcript.txt');
  if (!txt) {
    txt = 'This is a sample transcript. Replace assets/transcript.txt or assets/transcript.json with your own content to drive the live transcription effect.';
  }
  parseTranscript(txt);
  resetTranscript();
  playPauseBtn.disabled = false;
  restartBtn.disabled = false;
  setStatus('paused');
}

loadDefaultsBtn.addEventListener('click', loadDefaults);

// Initialize with defaults on load (so it “just works” after deploy)
window.addEventListener('DOMContentLoaded', loadDefaults);

