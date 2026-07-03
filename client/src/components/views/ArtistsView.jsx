import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Artwork from '../Artwork.jsx';

export default function ArtistsView({ search, onNavigate }) {
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    api.artists().then(setArtists).catch(console.error);
  }, []);

  const visible = search
    ? artists.filter((artist) => artist.name.toLowerCase().includes(search.toLowerCase()))
    : artists;

  return (
    <div className="view">
      <h1>Artists</h1>
      {!visible.length && <div className="empty-state">No artists yet.</div>}
      <div className="list-cards">
        {visible.map((artist) => (
          <button
            key={artist.name}
            className="list-card"
            onClick={() => onNavigate({ name: 'albums', params: { albumArtist: artist.name } })}
          >
            <Artwork artworkFile={artist.artworkFile} size="round" title={artist.name} />
            <div className="list-card-body">
              <div className="list-card-title">{artist.name}</div>
              <div className="list-card-subtitle">
                {artist.albumCount} albums · {artist.trackCount} songs
              </div>
            </div>
            <span className="list-card-chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
