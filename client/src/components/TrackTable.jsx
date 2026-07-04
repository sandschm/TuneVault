import { useState } from 'react';
import { api, urls } from '../api.js';
import { usePlayer } from '../player/PlayerContext.jsx';
import Artwork from './Artwork.jsx';
import ProviderSelect from './ProviderSelect.jsx';
import StarRating from './StarRating.jsx';

function formatDuration(seconds) {
  if (!seconds) return '–';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Menu section listing existing playlists plus a "New playlist" entry. */
function AddToPlaylistOptions({ playlists, onAdd, onAddToNew }) {
  return (
    <>
      <div className="row-menu-label">Add to playlist</div>
      {playlists.map((playlist) => (
        <button key={playlist.id} onClick={() => onAdd(playlist.id)}>
          ≡ {playlist.name}
        </button>
      ))}
      <button onClick={onAddToNew}>＋ New playlist…</button>
    </>
  );
}

export default function TrackTable({
  tracks,
  playlists,
  showArtwork = true,
  onChanged,
  onRemoveFromPlaylist,
}) {
  const player = usePlayer();
  const [menuTrackId, setMenuTrackId] = useState(null);
  const [provider, setProvider] = useState('auto');
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [anchorIndex, setAnchorIndex] = useState(null);

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMenuOpen(false);
  };

  const handleRowClick = (event, index) => {
    if (event.target.closest('button, a, input, .stars, .row-menu')) {
      return;
    }
    const track = tracks[index];
    setSelectedIds((current) => {
      const next = new Set(current);
      if (event.shiftKey && anchorIndex !== null) {
        const [from, to] = [Math.min(anchorIndex, index), Math.max(anchorIndex, index)];
        for (let i = from; i <= to; i += 1) {
          next.add(tracks[i].id);
        }
        return next;
      }
      if (event.metaKey || event.ctrlKey) {
        if (next.has(track.id)) next.delete(track.id);
        else next.add(track.id);
      } else {
        return new Set([track.id]);
      }
      return next;
    });
    if (!event.shiftKey) {
      setAnchorIndex(index);
    }
  };

  const selectedTrackIds = () => [...selectedIds].filter((id) => tracks.some((track) => track.id === id));

  const finishAction = () => {
    clearSelection();
    setMenuTrackId(null);
    onChanged();
  };

  const addToPlaylist = async (playlistId, trackIds) => {
    await api.addToPlaylist(playlistId, trackIds);
    finishAction();
  };

  const addToNewPlaylist = async (trackIds) => {
    const name = window.prompt('Name of the new playlist:');
    if (!name?.trim()) return;
    const playlist = await api.createPlaylist(name.trim());
    await addToPlaylist(playlist.id, trackIds);
  };

  const setRating = async (track, rating) => {
    await api.updateTrack(track.id, { rating });
    onChanged();
  };

  const enrich = async (track) => {
    try {
      const { source } = await api.enrichTrack(track.id, provider);
      window.alert(`Metadata updated from ${source} and saved into the file.`);
      finishAction();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const overwrite = async (track) => {
    if (
      !window.confirm(
        'Overwrite album, album artist, genre, year and track number with looked-up values? Title, artist and cover stay unchanged.',
      )
    ) {
      return;
    }
    try {
      const { source } = await api.overwriteTrack(track.id, provider);
      window.alert(`Metadata overwritten from ${source} and saved into the file.`);
      finishAction();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const downloadCover = async (track) => {
    try {
      const { source } = await api.downloadTrackCover(track.id, provider);
      window.alert(`Cover downloaded from ${source} and embedded into the file.`);
      finishAction();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const removeTracks = async (trackIds) => {
    const label = trackIds.length === 1 ? 'this song' : `${trackIds.length} songs`;
    if (!window.confirm(`Delete ${label} from the library? The files will be removed.`)) return;
    await api.deleteTracks(trackIds);
    finishAction();
  };

  const removeFromPlaylist = async (trackIds) => {
    for (const trackId of trackIds) {
      await onRemoveFromPlaylist(trackId);
    }
    clearSelection();
  };

  if (!tracks.length) {
    return <div className="empty-state">No songs here yet. Click “+ Add Music” to import files.</div>;
  }

  const selection = selectedTrackIds();

  return (
    <div className="track-table-wrapper">
      {selection.length > 0 && (
        <div className="selection-bar">
          <span className="selection-count">{selection.length} selected</span>
          <div className="row-menu-wrapper">
            <button className="secondary-button" onClick={() => setSelectionMenuOpen(!selectionMenuOpen)}>
              Add to playlist ▾
            </button>
            {selectionMenuOpen && (
              <div className="row-menu selection-menu" onMouseLeave={() => setSelectionMenuOpen(false)}>
                <AddToPlaylistOptions
                  playlists={playlists ?? []}
                  onAdd={(playlistId) => addToPlaylist(playlistId, selection)}
                  onAddToNew={() => addToNewPlaylist(selection)}
                />
              </div>
            )}
          </div>
          {onRemoveFromPlaylist && (
            <button className="secondary-button" onClick={() => removeFromPlaylist(selection)}>
              Remove from playlist
            </button>
          )}
          <button className="secondary-button danger" onClick={() => removeTracks(selection)}>
            Delete from library
          </button>
          <button className="selection-clear" title="Clear selection" onClick={clearSelection}>
            ✕
          </button>
        </div>
      )}

      <table className="track-table">
        <thead>
          <tr>
            <th className="col-number">#</th>
            <th>Title</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Genre</th>
            <th className="col-time">Time</th>
            <th className="col-rating">Rating</th>
            <th className="col-actions" />
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => {
            const isCurrent = player.currentTrack?.id === track.id;
            const isSelected = selectedIds.has(track.id);
            return (
              <tr
                key={track.id}
                className={`${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={(event) => handleRowClick(event, index)}
                onDoubleClick={() => player.playTracks(tracks, index)}
              >
                <td className="col-number">
                  <span className="row-number">{isCurrent && player.isPlaying ? '♪' : index + 1}</span>
                  <button className="row-play" title="Play" onClick={() => player.playTracks(tracks, index)}>
                    ▶
                  </button>
                </td>
                <td className="col-title">
                  {showArtwork && <Artwork artworkFile={track.artwork_file} size="mini" title={track.album} />}
                  <span>{track.title}</span>
                </td>
                <td>{track.artist}</td>
                <td>{track.album}</td>
                <td>{track.genre ?? '–'}</td>
                <td className="col-time">{formatDuration(track.duration)}</td>
                <td className="col-rating">
                  <StarRating rating={track.rating} onChange={(rating) => setRating(track, rating)} />
                </td>
                <td className="col-actions">
                  <div className="row-menu-wrapper">
                    <button
                      className="row-menu-button"
                      onClick={() => setMenuTrackId(menuTrackId === track.id ? null : track.id)}
                    >
                      •••
                    </button>
                    {menuTrackId === track.id && (
                      <div className="row-menu" onMouseLeave={() => setMenuTrackId(null)}>
                        <a href={urls.downloadTrack(track.id)} download>
                          Download
                        </a>
                        <div className="row-menu-label">Metadata source</div>
                        <ProviderSelect value={provider} onChange={setProvider} />
                        <button onClick={() => enrich(track)}>Complete metadata</button>
                        <button onClick={() => overwrite(track)}>Overwrite metadata</button>
                        <button onClick={() => downloadCover(track)}>Download cover</button>
                        <AddToPlaylistOptions
                          playlists={playlists ?? []}
                          onAdd={(playlistId) => addToPlaylist(playlistId, [track.id])}
                          onAddToNew={() => addToNewPlaylist([track.id])}
                        />
                        {onRemoveFromPlaylist && (
                          <button onClick={() => removeFromPlaylist([track.id])}>Remove from playlist</button>
                        )}
                        <button className="danger" onClick={() => removeTracks([track.id])}>
                          Delete from library
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
