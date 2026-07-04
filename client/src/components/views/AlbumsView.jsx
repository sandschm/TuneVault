import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Artwork from '../Artwork.jsx';

export default function AlbumsView({ filter, onNavigate }) {
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    api.albums(filter ?? {}).then(setAlbums).catch(console.error);
  }, [filter]);

  const heading = filter?.albumArtist ?? filter?.genre ?? 'Albums';

  return (
    <div className="view">
      <h1>{heading}</h1>
      {!albums.length && <div className="empty-state">No albums yet.</div>}
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
    </div>
  );
}
