import { useState } from 'react';
import { api } from '../../api.js';

function formatTotal(seconds) {
  const minutes = Math.round((seconds ?? 0) / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export default function PlaylistsManageView({ playlists, onNavigate, onLibraryChanged }) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggle = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((current) =>
      current.size === playlists.length ? new Set() : new Set(playlists.map((playlist) => playlist.id)),
    );
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    const label = ids.length === 1 ? 'this playlist' : `${ids.length} playlists`;
    if (!window.confirm(`Delete ${label}? Songs stay in the library.`)) return;
    await api.deletePlaylists(ids);
    setSelectedIds(new Set());
    onLibraryChanged();
  };

  return (
    <div className="view">
      <div className="playlist-header">
        <h1>Playlists</h1>
        {selectedIds.size > 0 && (
          <div className="album-header-actions">
            <button className="secondary-button danger" onClick={deleteSelected}>
              Delete {selectedIds.size} selected
            </button>
          </div>
        )}
      </div>
      {!playlists.length && <div className="empty-state">No playlists yet. Create one with the + in the sidebar.</div>}
      {playlists.length > 0 && (
        <table className="track-table">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={selectedIds.size === playlists.length && playlists.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th>Name</th>
              <th>Songs</th>
              <th className="col-time">Length</th>
            </tr>
          </thead>
          <tbody>
            {playlists.map((playlist) => (
              <tr key={playlist.id}>
                <td className="col-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(playlist.id)}
                    onChange={() => toggle(playlist.id)}
                  />
                </td>
                <td className="col-title">
                  <button className="link-button" onClick={() => onNavigate({ name: 'playlist', playlist })}>
                    {playlist.name}
                  </button>
                </td>
                <td>{playlist.trackCount}</td>
                <td className="col-time">{formatTotal(playlist.totalDuration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
