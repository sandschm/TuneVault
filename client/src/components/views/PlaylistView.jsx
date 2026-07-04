import { useCallback, useEffect, useState } from 'react';
import { api, urls } from '../../api.js';
import { usePlayer } from '../../player/PlayerContext.jsx';
import TrackTable from '../TrackTable.jsx';

export default function PlaylistView({ playlist, playlists, onNavigate, onLibraryChanged }) {
  const player = usePlayer();
  const [tracks, setTracks] = useState([]);

  const load = useCallback(() => {
    api.playlistTracks(playlist.id).then(setTracks).catch(console.error);
  }, [playlist.id]);

  useEffect(load, [load]);

  const rename = async () => {
    const name = window.prompt('Rename playlist:', playlist.name);
    if (!name?.trim()) return;
    await api.renamePlaylist(playlist.id, name.trim());
    onLibraryChanged();
    onNavigate({ name: 'playlist', playlist: { ...playlist, name: name.trim() } });
  };

  const remove = async () => {
    if (!window.confirm(`Delete playlist "${playlist.name}"? Songs stay in the library.`)) return;
    await api.deletePlaylist(playlist.id);
    onLibraryChanged();
    onNavigate({ name: 'songs' });
  };

  const removeTrack = async (trackId) => {
    await api.removeFromPlaylist(playlist.id, trackId);
    load();
    onLibraryChanged();
  };

  return (
    <div className="view">
      <div className="playlist-header">
        <div>
          <h1>{playlist.name}</h1>
          <div className="album-header-meta">{tracks.length} songs</div>
        </div>
        <div className="album-header-actions">
          <button className="primary-button" onClick={() => tracks.length && player.playTracks(tracks, 0)}>
            ▶ Play
          </button>
          <a className="secondary-button" href={urls.downloadPlaylist(playlist.id)}>
            ⤓ Download
          </a>
          <button className="secondary-button" onClick={rename}>
            Rename
          </button>
          <button className="secondary-button danger" onClick={remove}>
            Delete
          </button>
        </div>
      </div>
      <TrackTable
        tracks={tracks}
        playlists={playlists.filter((entry) => entry.id !== playlist.id)}
        onChanged={() => {
          load();
          onLibraryChanged();
        }}
        onRemoveFromPlaylist={removeTrack}
      />
    </div>
  );
}
