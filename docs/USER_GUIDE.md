# TuneVault — User Guide

TuneVault is your personal music library in the browser. This guide walks you
through every feature.

## 1. Opening the app

Navigate to the address where TuneVault is hosted (for example
`http://localhost:8080`). The layout follows iTunes / Apple Music:

- **Top bar** — playback controls (shuffle, previous, play/pause, next, repeat,
  volume) on the left, the "now playing" display in the center, search,
  **+ Add Music** and the theme toggle on the right.
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

- **Songs** — every track in one list.
- **Albums** — a grid of album covers. Click an album to open it.
- **Artists** — listed with artist photos (fetched automatically from Deezer
  and cached on the server; a placeholder is shown if no photo is found).
- **Artists** — all **song artists** (from the track metadata, not the album
  artist) with song counts. Clicking an artist shows that artist's songs.
- **Genres** — albums grouped by genre.
- **Favorites** — every song you have rated with at least one star, best-rated
  first.

## 4. Searching

Type into the **search field** in the top bar. While you type, the main area
shows grouped results for your whole library:

- **Artists** whose name matches,
- **Albums** whose title matches,
- **Songs** whose title, artist or album matches.

Click any result to jump to it, or work with the found songs directly (play,
rate, select, add to playlists). Clearing the field or clicking any sidebar
entry leaves the search.

## 5. Playing music

- **Double-click** any song row, or hover over the row number and click the
  **▶** button that appears.
- On an album or playlist page, the red **▶ Play** button plays it from the top.
- The center display shows the current song with cover, elapsed/remaining time
  and a draggable progress bar.
- Use **⤨ shuffle** and **⟲ repeat** next to the transport buttons; the slider
  on the right of the controls adjusts the volume.

## 6. Selecting multiple songs

In every song list you can select several songs at once:

- **Click** a row to select it.
- **⌘/Ctrl + click** adds or removes single rows.
- **Shift + click** selects a range.

A selection bar appears above the list with bulk actions: **Add to playlist**
(existing or new), **Remove from playlist** (when inside a playlist) and
**Delete from library**. The **✕** on the right clears the selection.

## 7. Rating songs (favorites)

Every song row has five stars. Click a star to rate the song 1–5; click the
same star again to remove the rating. Any song with at least one star appears
in the **Favorites** view.

## 8. Playlists

- **Create** — click **+** next to "Playlists" in the sidebar, or choose
  **＋ New playlist…** while adding songs: you are asked for the name first,
  then the songs are added to it.
- **Add songs** — open the **•••** menu of a song (or select several songs and
  use the selection bar) and pick a playlist under *Add to playlist*, or
  create a new one. A song can be in **any number of playlists**, but only
  once per playlist.
- **Remove songs** — via the song's **•••** menu or the selection bar
  (*Remove from playlist*). The songs stay in your library.
- **Manage** — click the **PLAYLISTS** heading in the sidebar to open the
  playlist overview. There you can select one or many playlists with the
  checkboxes and **delete them at once** (songs are never deleted).
- **Rename / delete a single playlist** — open the playlist and use the
  buttons in its header.

## 9. Downloading music

- **Single song** — row menu **••• → Download**.
- **Album** — open the album and click **⤓ Download** (ZIP archive).
- **Playlist** — open the playlist and click **⤓ Download** (ZIP archive).

## 10. Completing metadata and covers

TuneVault uses the free **iTunes Search API** and **MusicBrainz / Cover Art
Archive** — no API key needed. Everything fetched is written **into the audio
files themselves**, so the information survives exports and downloads.

- **Single song** — row menu **••• → Complete metadata** fills the *missing*
  fields (genre, year, album, …) and fetches a cover if the song has none.
  Existing tags are never overwritten.
- **Whole album** — open the album and click **Complete metadata** to fill
  missing genre/year for all songs of the album at once.
- **Overwrite metadata** — row menu **••• → Overwrite metadata** (song) or the
  album's **Overwrite metadata** button *replace* existing values with the
  looked-up ones: album, album artist, genre, year (and track number for a
  single song). Titles, artists and covers are never touched. A confirmation
  is required.
- **Covers** — **••• → Download cover** (song) or the album's **Download
  cover** button fetch the cover art and embed it into the file(s), replacing
  an existing cover.

## 11. Deleting songs

Row menu **••• → Delete from library**, or select several songs and use
**Delete from library** in the selection bar. This removes the database entry
*and* the audio files on the server, so a confirmation is required.

## Tips

- Ratings, playlists and play counts live in the server's database — they
  survive restarts and are included in backups of the `data/` directory.
- Since metadata and covers are persisted into the files, downloading an album
  as ZIP gives you fully tagged files including artwork.
