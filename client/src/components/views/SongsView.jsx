import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import TrackTable from '../TrackTable.jsx';

export default function SongsView({ search, playlists, favoritesOnly = false, onLibraryChanged }) {
  const [tracks, setTracks] = useState([]);

  const load = useCallback(() => {
    const params = {};
    if (search) params.search = search;
    if (favoritesOnly) {
      params.favorites = '1';
      params.sort = 'rating';
      params.dir = 'desc';
    }
    api.tracks(params).then(setTracks).catch(console.error);
  }, [search, favoritesOnly]);

  useEffect(load, [load]);

  const handleChanged = () => {
    load();
    onLibraryChanged();
  };

  return (
    <div className="view">
      <h1>{favoritesOnly ? 'Favorites' : 'Songs'}</h1>
      <TrackTable tracks={tracks} playlists={playlists} onChanged={handleChanged} />
    </div>
  );
}
