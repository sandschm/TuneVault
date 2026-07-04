import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import TrackTable from '../TrackTable.jsx';

export default function SongsView({
  playlists,
  favoritesOnly = false,
  artist = null,
  onNavigate,
  onLibraryChanged,
}) {
  const [tracks, setTracks] = useState([]);

  const load = useCallback(() => {
    const params = {};
    if (artist) params.artist = artist;
    if (favoritesOnly) {
      params.favorites = '1';
      params.sort = 'rating';
      params.dir = 'desc';
    }
    api.tracks(params).then(setTracks).catch(console.error);
  }, [artist, favoritesOnly]);

  useEffect(load, [load]);

  const handleChanged = () => {
    load();
    onLibraryChanged();
  };

  return (
    <div className="view">
      {artist && (
        <button className="back-link" onClick={() => onNavigate({ name: 'artists' })}>
          ‹ Artists
        </button>
      )}
      <h1>{artist ?? (favoritesOnly ? 'Favorites' : 'Songs')}</h1>
      <TrackTable tracks={tracks} playlists={playlists} onChanged={handleChanged} />
    </div>
  );
}
