# TuneVault — Developer Guide

## 1. Overview

TuneVault is a self-hosted music library consisting of:

| Layer     | Technology                                            |
| --------- | ----------------------------------------------------- |
| Frontend  | React 18 + Vite (single-page app, plain CSS)          |
| Backend   | Node.js 22, Express 4 (ES modules)                    |
| Database  | SQLite via `better-sqlite3` (synchronous, WAL mode)   |
| Tag/audio | `music-metadata` (ID3, Vorbis, MP4 tag parsing)       |
| Packaging | Multi-stage Dockerfile, single runtime container      |

All persistent state lives under one data directory (`DATA_DIR`, `/data` in
Docker):

```
/data
├── library.db          # SQLite database (tracks, playlists)
├── music/              # audio files: Artist/Album/NN Title.ext
└── covers/             # album art, deduplicated by SHA-1 content hash
```

## 2. Architecture

The architecture diagrams are maintained as PlantUML sources in
[`docs/diagrams/`](diagrams):

| Diagram | File |
| ------- | ---- |
| System architecture (components) | [architecture.puml](diagrams/architecture.puml) |
| Database schema (ERD)            | [data-model.puml](diagrams/data-model.puml) |
| Upload & import sequence         | [sequence-upload.puml](diagrams/sequence-upload.puml) |
| Playback sequence                | [sequence-playback.puml](diagrams/sequence-playback.puml) |
| Metadata enrichment sequence     | [sequence-enrichment.puml](diagrams/sequence-enrichment.puml) |

Render them with any PlantUML tool, e.g. `plantuml docs/diagrams/*.puml` or the
PlantUML plugin of your IDE.

### 2.1 Backend layout (`server/src`)

```
index.js                 # composition root: wires routes, static client, errors
config.js                # all environment-based configuration in one place
db.js                    # SQLite connection + schema (idempotent CREATEs)
routes/
  tracks.js              # list/filter, stream, download, rate, edit, delete, enrich
  library.js             # derived views: albums, artists, genres, stats + album zip
  playlists.js           # playlist CRUD, membership, ordering, zip download
  uploads.js             # multipart upload endpoint (multer)
  artwork.js             # serves cover images with immutable caching
services/
  importService.js       # tag parsing, file placement, track insertion
  artworkService.js      # store/dedupe/download cover images
  archiveService.js      # streams ZIP archives (albums, playlists, selections)
  metadataLookupService.js  # provider chain: iTunes Search API -> MusicBrainz
```

Design notes (SOLID/GRASP):

- **Single responsibility / high cohesion** — routes only translate HTTP to
  service/database calls; file handling, tag parsing, archiving and external
  lookups each live in their own service module.
- **Open/closed** — `metadataLookupService` iterates over an ordered provider
  list; a new provider (e.g. Deezer) is one new function appended to that list.
- **Information expert** — album/artist/genre aggregates are computed by the
  database (`GROUP BY`), not reassembled in JavaScript.
- **Low coupling** — the frontend talks to the backend exclusively through the
  JSON API in `client/src/api.js`; the backend knows nothing about React.
- Albums/artists/genres are intentionally **derived** from `tracks` instead of
  being separate tables — this removes a whole class of synchronization bugs
  (creator: the track row is the single source of truth).

### 2.2 Frontend layout (`client/src`)

```
main.jsx                 # entry point, mounts App inside PlayerProvider
App.jsx                  # top-level state: current view, search, playlists
api.js                   # thin typed-ish wrapper around the REST API + URLs
styles.css               # Apple-Music-inspired theme (accent #fa2d48)
player/PlayerContext.jsx # queue, shuffle/repeat, HTML5 Audio lifecycle
components/
  PlayerBar.jsx          # transport controls, LCD display, search, upload
  Sidebar.jsx            # library sections + playlists
  TrackTable.jsx         # song rows: play, stars, ••• menu (download/enrich/...)
  StarRating.jsx         # 1-5 star widget (click same star to clear)
  Artwork.jsx            # cover image with placeholder fallback
  UploadDialog.jsx       # drag & drop upload with progress + results
  views/                 # Songs, Albums, AlbumDetail, Artists, Genres, Playlist
```

Navigation is a simple `view` state object in `App.jsx` (`{name, params}`) —
no router dependency. Playback state is a React context so the player keeps
playing while the user navigates.

## 3. REST API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/api/tracks?search=&artist=&album=&genre=&favorites=1&sort=&dir=` | list/filter tracks |
| GET    | `/api/tracks/:id/stream` | audio stream (HTTP range supported) |
| GET    | `/api/tracks/:id/download` | download original file |
| POST   | `/api/tracks/download` `{trackIds, name}` | ZIP of arbitrary tracks |
| PATCH  | `/api/tracks/:id` | edit tags / set `rating` (0–5) |
| DELETE | `/api/tracks/:id` | remove track + file |
| POST   | `/api/tracks/:id/enrich` | fill missing metadata via open APIs |
| GET    | `/api/library/albums[?albumArtist=&genre=]` | album aggregates |
| GET    | `/api/library/albums/tracks?albumArtist=&album=` | songs of an album |
| GET    | `/api/library/albums/download?albumArtist=&album=` | album as ZIP |
| GET    | `/api/library/artists` / `/genres` / `/stats` | aggregates |
| GET/POST | `/api/playlists` | list / create |
| PATCH/DELETE | `/api/playlists/:id` | rename / delete |
| GET/POST | `/api/playlists/:id/tracks` | list / add tracks |
| DELETE | `/api/playlists/:id/tracks/:trackId` | remove track |
| PUT    | `/api/playlists/:id/order` `{trackIds}` | reorder |
| GET    | `/api/playlists/:id/download` | playlist as ZIP |
| POST   | `/api/uploads` (multipart `files`) | import audio files |
| GET    | `/api/artwork/:fileName` | cover image |
| GET    | `/api/health` | liveness probe |

## 4. Development setup

```bash
# Terminal 1 - API on :8080 (data lands in server/data/)
cd server && npm install && npm run dev

# Terminal 2 - UI on :5173 with /api proxied to :8080
cd client && npm install && npm run dev
```

Production-style run without Docker:

```bash
cd client && npm run build
cd ../server && npm start        # serves client/dist itself
```

## 5. Docker

The [Dockerfile](../Dockerfile) has three stages: client build → server
dependency install → slim runtime (runs as the unprivileged `node` user,
`/data` declared as a volume).

```bash
docker compose up -d --build     # binds ./data on the host
```

The image is OCI-compliant and verified with **Podman** as well:

```bash
podman build -t tunevault .
podman run -d -p 8080:8080 -v "$(pwd)/data:/data" --name tunevault tunevault
```

Notes:

- `better-sqlite3` is a native module. The image installs the prebuilt binary;
  if none is available for your platform the Dockerfile falls back to a source
  build (python3 + build-essential are installed on demand).
- Uploads are first written to the container's `/tmp` and then moved into
  `/data`. Because those are different file systems, `importService.moveFile`
  falls back from `rename` to copy + delete on `EXDEV` — do not "simplify" it
  back to a plain `fs.renameSync`.

## 6. External metadata APIs

`metadataLookupService.js` tries providers in order and returns the first hit:

1. **iTunes Search API** — `https://itunes.apple.com/search` (no key, rate
   limit ~20 req/min). Artwork URL is upgraded from 100×100 to 600×600.
2. **MusicBrainz** — `https://musicbrainz.org/ws/2/recording` (requires a
   `User-Agent`, max 1 req/s). Covers come from the Cover Art Archive by
   release id.

Enrichment is **non-destructive**: only `NULL`/"Unknown" fields are filled and
covers are only added when the track has none.

## 7. Conventions

- ES modules everywhere, no TypeScript build step on the server.
- Database access only through `better-sqlite3` prepared statements —
  parameters are always bound, never concatenated (SQL injection safety).
- User-controlled path segments are sanitized (`sanitizePathSegment`) before
  touching the file system; artwork file names reject `/` and `..`.
- Keep the PlantUML diagrams in `docs/diagrams/` up to date when changing
  architecture, schema or the flows they describe.
