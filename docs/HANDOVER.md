# TuneVault — Handover / Continue on Another PC

This document contains everything needed to pick the project up on a new
machine.

## 1. What this project is

A self-hosted, iTunes/Apple-Music-style music library web app. Full feature
description: [README.md](../README.md) and [USER_GUIDE.md](USER_GUIDE.md).
Architecture and API: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) with PlantUML
diagrams in [diagrams/](diagrams).

## 2. Prerequisites on the new machine

| Tool | Version | Needed for |
| ---- | ------- | ---------- |
| Node.js | ≥ 20 (developed with 24) | local development |
| npm | ≥ 10 | dependency install |
| Docker **or** Podman | any recent | container image (developed/tested with Podman 5.8 on macOS arm64) |
| PlantUML (optional) | any | rendering the architecture diagrams |

No API keys are required — the metadata providers (iTunes Search API,
MusicBrainz, Cover Art Archive, Deezer for artist photos) are free and keyless.

## 3. Getting the code onto the new machine

The project lives in a local git repository (`git init` was done; no remote is
configured yet). To transfer:

```bash
# on this machine: commit and push to a remote of your choice
cd tunevault
git add -A && git commit -m "TuneVault"
git remote add origin <your-remote-url>
git push -u origin main

# on the new machine
git clone <your-remote-url>
```

Alternatively copy the folder — everything except `node_modules/`, `client/dist/`
and `data/` (all gitignored, all reproducible; `data/` is your music library
and should be moved separately if you want to keep it).

## 4. First start on the new machine

```bash
# Development (two terminals)
cd server && npm install && npm run dev     # API on :8080, data in server/data/
cd client && npm install && npm run dev     # UI on :5173, /api proxied to :8080

# Production-style without container
cd client && npm install && npm run build
cd ../server && npm install && npm start    # serves the built client on :8080

# Container (Docker or Podman)
podman build -t tunevault .
podman run -d -p 8080:8080 -v "$(pwd)/data:/data" --name tunevault tunevault
# docker-compose.yml exists too (host port 8961 by default)
```

## 5. Where the state lives

Everything persistent is under **one directory** (`DATA_DIR`, default
`server/data/` locally, `/data` in the container):

```
data/
├── library.db   # SQLite: tracks, playlists, ratings, play counts
├── music/       # audio files as Artist/Album/NN Title.ext
├── covers/      # cover images, deduplicated by SHA-1
└── artists/     # artist photos from Deezer, cached by SHA-1 of the name
```

Backup/move = copy this directory. Since v1.1 metadata and covers are also
written into the audio files themselves, so the files are self-contained.

## 6. Project layout (orientation)

```
tunevault/
├── Dockerfile, docker-compose.yml, .dockerignore
├── README.md
├── docs/            # USER_GUIDE, DEVELOPER_GUIDE, HANDOVER, diagrams/*.puml
├── server/          # Express API (ES modules, no build step)
│   └── src/         # index.js, config.js, db.js, routes/, services/
└── client/          # React 18 + Vite SPA
    └── src/         # App.jsx, api.js, theme.js, styles.css, components/
```

Details per file: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) section 2.

## 7. Conventions and gotchas (read before changing code)

- **Coding rules**: SOLID/GRASP; keep the PlantUML diagrams in
  `docs/diagrams/` in sync with code changes.
- **SQL**: only prepared statements with bound parameters.
- **`importService.moveFile`** falls back from `rename` to copy+delete on
  `EXDEV` — required in containers (tmpfs → volume). Do not simplify.
- **Enrichment semantics**: fill missing fields only; explicit *Download
  cover* replaces covers; explicit *Overwrite metadata* replaces
  album/albumArtist/genre/year(/trackNo) but never title, artist or cover.
  All persist into DB **and** file tags via `enrichmentService` →
  `tagWriterService`.
- **Navigation**: in `App.jsx` always navigate through `navigate()` (clears
  the search), never raw `setView`.
- **Albums/artists/genres** are derived from `tracks` via `GROUP BY` —
  there are intentionally no separate tables. Artists group by the song
  artist (`artist`), album views by `album_artist`.
- **MusicBrainz** requires a `User-Agent` header (set in
  `metadataLookupService.js`) and allows ~1 request/second.

## 8. How to test changes

There is no automated test suite yet (candidate for future work). Manual
verification so far:

1. Generate small tagged MP3s (silent MPEG frames + ID3 via `node-id3`) —
   any tagged MP3s work.
2. Upload via UI or `curl -F "files=@x.mp3" localhost:8080/api/uploads`.
3. Exercise the API (see endpoint table in the developer guide) and the UI.
4. For container changes: build the image and re-test upload (the EXDEV case
   only appears inside containers).

## 9. Current status & ideas for next steps

Implemented and manually verified: everything in the README feature list
(as of 2026-07-04).

Open ideas / not yet implemented:

- Automated tests (API integration tests would fit well)
- Playlist reordering UI (the API `PUT /api/playlists/:id/order` exists)
- Editing tags manually in the UI (the API `PATCH /api/tracks/:id` exists)
- Multi-user support / authentication (currently none — do not expose the
  app unauthenticated to the internet)
- Rate limiting for MusicBrainz when enriching many albums in a row
