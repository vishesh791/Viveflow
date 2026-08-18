# VibeFlow

An independent, folder-powered music player. VibeFlow reads playlists straight
from a `/songs/` directory on disk — no accounts, no streaming backend.

## What changed from the old build

This is a full re-skin, not a re-skin of Spotify's UI. Everything below was
rebuilt from scratch:

- **Visual identity** — deep plum/indigo background, a rose→amber "flow"
  gradient, and a mint highlight color. Nothing here reuses Spotify's black
  + green palette.
- **Typography** — Fraunces (display serif) for headings, Sora for UI text,
  JetBrains Mono for timestamps and track numbers.
- **Layout & wording** — "Rail" (sidebar) instead of a Spotify-style library
  panel, "crates" instead of "playlists," a "Deck" instead of a Spotify
  playbar, "Discover" instead of "Spotify Playlists," etc.
- **Icons** — every icon (play, pause, prev/next, search, volume, menu) is a
  hand-drawn inline SVG. None of Spotify's icon assets are used or referenced.
- **Signature element** — the seekbar is a waveform made of individual bars
  that fill with the flow gradient as a track plays, instead of a thin line
  with a dot.

## What stayed the same (by design)

Your playback engine is untouched in behavior:

- Folder-based song loading via `fetch('http://127.0.0.1:3000/<folder>/')`
  and parsing the directory listing for `.mp3` links.
- `info.json` + `cover.jpg` per crate for the album grid (`songs/<folder>/`).
- Play / pause, previous / next (based on the currently loaded track's index),
  seeking, and a volume slider with a mute toggle.
- The same local static-server requirement as your original project (e.g.
  `http-server`, `live-server`, or whatever you were serving `spotify.html`
  with on port 3000) — VibeFlow expects that server to still be running and
  to serve directory listings for `/songs/` and each crate subfolder.

## File structure

```
vibeflow/
├── index.html
├── css/
│   ├── style.css      ← design tokens + layout + components
│   └── utility.css     ← low-level helpers, scrollbar theming
├── js/
│   └── app.js           ← player logic (rewritten class names, same behavior)
└── songs/                ← drop your existing crate folders in here
    └── <crate-name>/
        ├── info.json    ← { "title": "...", "description": "..." }
        ├── cover.jpg
        └── *.mp3
```

## Setup

1. Copy your existing `/songs/` folder (with each crate's `.mp3` files,
   `cover.jpg`, and `info.json`) into `vibeflow/songs/`.
2. Serve the `vibeflow/` folder with a static server on `127.0.0.1:3000` that
   supports directory listing (the same one you used before) — for example:
   ```
   npx http-server -p 3000
   ```
3. Open `http://127.0.0.1:3000/` in your browser.
4. On first load, VibeFlow queues whatever is in `songs/ncs/` by default —
   change the folder name in `main()` in `js/app.js` if your default crate is
   named differently.

## Notes

- If a crate is missing `info.json`, the card falls back to the folder name
  and a generic description instead of failing.
- If `cover.jpg` is missing, the artwork area just stays on the gradient
  background rather than showing a broken image icon.
