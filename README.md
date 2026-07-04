# TuneVault

A self-hosted, iTunes-style music library as a web application. Upload your music,
browse it by album, artist or genre, build playlists, rate your favorite songs with
stars and play everything straight from the browser — with an Apple-Music-inspired
look and feel.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20SQLite-fa2d48)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Import via upload** — drag & drop or file picker; tags (ID3, Vorbis, MP4) and
  embedded cover art are read automatically
- **Start page** — recently played, recently added, library-based
  recommendations and the newest playlists
- **Browse** by songs, albums, song artists and genres — artist views show
  artist photos (looked up via the free Deezer API, cached locally)
- **Global search** across artists, albums and song titles with grouped results
- **Play** single songs, whole albums or playlists (shuffle, repeat, seek, volume)
- **Playlists** — create (also on the fly while adding songs), rename, delete
  one or many at once; a song can be in any number of playlists
- **Multi-selection** — click / ⌘-click / shift-click songs, then bulk add to
  playlists, remove from a playlist or delete from the library
- **Edit metadata manually** — dialog for single songs (title, artist, album,
  genre, year, track/disc no.) and whole albums (album, album artist, genre,
  year); changes are written into the audio files
- **Favorites** — rate songs with 1–5 stars, dedicated Favorites view
- **Download** single songs, or albums and playlists as ZIP archives
- **Metadata completion** — per song or per album; missing genre/year/album/cover
  looked up via the iTunes Search API, Deezer and MusicBrainz/Cover Art Archive
  (free, no API key) and **persisted into the audio files**. Several candidates
  are fetched and scored against the existing tags (title, artist, duration,
  album), and a choicebox lets you pick the source (Auto/iTunes/Deezer/
  MusicBrainz)
- **Metadata overwrite** — per song or per album; replaces album, album artist,
  genre, year (and track number) with the looked-up values — titles, artists
  and covers stay untouched
- **Cover download** — per song or per album, embedded into the files
- **Light & dark theme** — toggle in the top-right corner

## Quick start (Docker / Podman)

```bash
docker compose up -d --build
# or manually:
docker build -t tunevault .
docker run -d -p 8080:8080 -v "$(pwd)/data:/data" --name tunevault tunevault
```

The image is OCI-compatible and works identically with Podman:

```bash
podman build -t tunevault .
podman run -d -p 8080:8080 -v "$(pwd)/data:/data" --name tunevault tunevault
# or: podman compose up -d --build
```

Open <http://localhost:8080>. All music files, cover art and the SQLite database
are stored on the host in the mounted `data/` directory.

## Quick start (local development)

```bash
cd server && npm install && npm run dev     # API on :8080
cd client && npm install && npm run dev     # UI on :5173 (proxies /api)
```

For a production-style local run: `cd client && npm run build`, then start the
server — it serves the built client automatically.

## Configuration

| Environment variable | Default        | Purpose                              |
| -------------------- | -------------- | ------------------------------------ |
| `PORT`               | `8080`         | HTTP port                            |
| `DATA_DIR`           | `./data`       | Root for music, covers and database  |
| `CLIENT_DIST`        | `../client/dist` | Location of the built frontend    |
| `MAX_UPLOAD_MB`      | `500`          | Upload size limit per file           |

## Documentation

- [User guide](docs/USER_GUIDE.md)
- [Developer guide & architecture](docs/DEVELOPER_GUIDE.md)
- [Handover — continue on another PC](docs/HANDOVER.md)
- PlantUML diagrams: [docs/diagrams/](docs/diagrams)

## Supported audio formats

MP3, M4A/AAC, FLAC, OGG/Opus, WAV

## License

[MIT](LICENSE)
