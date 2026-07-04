import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Artwork from '../Artwork.jsx';
import TrackTable from '../TrackTable.jsx';

export default function SearchView({ search, playlists, onNavigate, onLibraryChanged }) {
  const [results, setResults] = useState({ artists: [], albums: [], tracks: [] });

  useEffect(() => {
    const timer = setTimeout(() => {
      api.searchLibrary(search).then(setResults).catch(console.error);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { artists, albums, tracks } = results;
  const empty = !artists.length && !albums.length && !tracks.length;

  return (
    <div className="view">
      <h1>Results for “{search}”</h1>
      {empty && <div className="empty-state">Nothing found for “{search}”.</div>}

      {artists.length > 0 && (
        <section className="search-section">
          <h2>Artists</h2>
          <div className="list-cards">
            {artists.map((artist) => (
              <button
                key={artist.name}
                className="list-card"
                onClick={() => onNavigate({ name: 'artist', params: { artist: artist.name } })}
              >
                <Artwork artworkFile={artist.artworkFile} size="round" title={artist.name} />
                <div className="list-card-body">
                  <div className="list-card-title">{artist.name}</div>
                  <div className="list-card-subtitle">{artist.trackCount} songs</div>
                </div>
                <span className="list-card-chevron">›</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="search-section">
          <h2>Albums</h2>
          <div className="album-grid">
            {albums.map((album) => (
              <button
                key={`${album.albumArtist}|${album.album}`}
                className="album-card"
                onClick={() => onNavigate({ name: 'album', params: album })}
              >
                <Artwork artworkFile={album.artworkFile} size="large" title={album.album} />
                <div className="album-card-title">{album.album}</div>
                <div className="album-card-artist">{album.albumArtist}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {tracks.length > 0 && (
        <section className="search-section">
          <h2>Songs</h2>
          <TrackTable tracks={tracks} playlists={playlists} onChanged={onLibraryChanged} />
        </section>
      )}
    </div>
  );
}
