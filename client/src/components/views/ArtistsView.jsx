import { useEffect, useState } from 'react';
import { api, urls } from '../../api.js';
import Artwork from '../Artwork.jsx';

export default function ArtistsView({ onNavigate }) {
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    api.artists().then(setArtists).catch(console.error);
  }, []);

  return (
    <div className="view">
      <h1>Artists</h1>
      {!artists.length && <div className="empty-state">No artists yet.</div>}
      <div className="list-cards">
        {artists.map((artist) => (
          <button
            key={artist.name}
            className="list-card"
            onClick={() => onNavigate({ name: 'artist', params: { artist: artist.name } })}
          >
            <Artwork src={urls.artistImage(artist.name)} size="round" title={artist.name} />
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
