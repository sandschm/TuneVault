# TuneVault — User Guide

TuneVault is your personal music library in the browser. This guide walks you
through every feature.

## 1. Opening the app

Navigate to the address where TuneVault is hosted (for example
`http://localhost:8080`). The layout follows iTunes / Apple Music:

- **Top bar** — playback controls (shuffle, previous, play/pause, next, repeat,
  volume) on the left, the "now playing" display in the center, search and
  **+ Add Music** on the right.
- **Sidebar** — your library sections (Songs, Albums, Artists, Genres,
  Favorites) and your playlists.
- **Main area** — the content of the selected section.

### Light and dark theme

Click the **☾ / ☀ button** in the top-right corner to switch between the light
and dark theme. Your choice is remembered in the browser; on first visit the
app follows your operating system's appearance setting.

## 2. Importing music

1. Click **+ Add Music** in the top-right corner.
2. Drag audio files into the dashed drop zone, or click it to open a file
   picker. You can select many files at once.
3. A progress bar shows the upload; afterwards each file is listed as
   *imported* ✓, *skipped* ⚠ (unsupported type) or *failed* ✕.

Supported formats: **MP3, M4A/AAC, FLAC, OGG/Opus, WAV.**

During import TuneVault reads the file's tags (title, artist, album, genre,
year, track number) and embedded cover art. Files are stored on the server in
an `Artist/Album/` folder structure.

## 3. Browsing your collection

Use the sidebar:

- **Songs** — every track in one list. Click a column-sorted list and use the
  search field (top right) to filter by title, artist or album.
- **Albums** — a grid of album covers. Click an album to open it, where you can
  play or download the whole album.
- **Artists** — all album artists with album/song counts. Clicking an artist
  shows their albums.
- **Genres** — same idea, grouped by genre.
- **Favorites** — every song you have rated with at least one star, best-rated
  first.

The **search field** in the top bar filters whatever view you are in.

## 4. Playing music

- **Double-click** any song row, or hover over the row number and click the
  **▶** button that appears.
- On an album or playlist page, the red **▶ Play** button plays it from the top.
- The center display shows the current song with cover, elapsed/remaining time
  and a draggable progress bar.
- Use **⤨ shuffle** and **⟲ repeat** next to the transport buttons; the slider
  on the right of the controls adjusts the volume.
- When a song ends, the next song of the current list plays automatically.

## 5. Rating songs (favorites)

Every song row has five stars. Click a star to rate the song 1–5; click the
same star again to remove the rating. Any song with at least one star appears
in the **Favorites** view.

## 6. Playlists

- **Create** — click **+** next to the "Playlists" header in the sidebar and
  enter a name.
- **Add songs** — open the **•••** menu at the right end of any song row and
  choose the playlist under *Add to playlist*.
- **Manage** — open a playlist to play, download, **rename** or **delete** it
  (deleting a playlist never deletes songs).
- **Remove a song** from a playlist via the song's **•••** menu.

## 7. Downloading music

- **Single song** — row menu **••• → Download**.
- **Album** — open the album and click **⤓ Download** (ZIP archive).
- **Playlist** — open the playlist and click **⤓ Download** (ZIP archive).

## 8. Completing missing metadata

If a song is missing its genre, year, album name or cover art:

1. Open the song's **•••** menu.
2. Click **Complete metadata**.

TuneVault searches the **iTunes Search API** first and **MusicBrainz** as a
fallback, fills in only the *missing* fields, and downloads a cover if the song
has none. Existing tags are never overwritten.

## 9. Deleting songs

Row menu **••• → Delete from library**. This removes the database entry *and*
the audio file on the server, so a confirmation is required.

## Tips

- Cover art is shared per album: if one file of an album has embedded art,
  other files of the same album will use it too.
- Ratings, playlists and play counts are stored in the server's database —
  they survive restarts and are included in backups of the `data/` directory.
