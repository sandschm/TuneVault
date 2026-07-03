import { useState } from 'react';
import { api, urls } from '../api.js';
import { usePlayer } from '../player/PlayerContext.jsx';
import Artwork from './Artwork.jsx';
import StarRating from './StarRating.jsx';

function formatDuration(seconds) {
  if (!seconds) return '–';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
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

  const setRating = async (track, rating) => {
    await api.updateTrack(track.id, { rating });
    onChanged();
  };

  const enrich = async (track) => {
    try {
      const { source } = await api.enrichTrack(track.id);
      window.alert(`Metadata updated from ${source}.`);
      onChanged();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const remove = async (track) => {
    if (!window.confirm(`Delete "${track.title}" from the library? The file will be removed.`)) return;
    await api.deleteTrack(track.id);
    onChanged();
  };

  const addToPlaylist = async (playlistId, track) => {
    await api.addToPlaylist(playlistId, [track.id]);
    setMenuTrackId(null);
    onChanged();
  };

  if (!tracks.length) {
    return <div className="empty-state">No songs here yet. Click “+ Add Music” to import files.</div>;
  }

  return (
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
          return (
            <tr
              key={track.id}
              className={isCurrent ? 'current' : ''}
              onDoubleClick={() => player.playTracks(tracks, index)}
            >
              <td className="col-number">
                <span className="row-number">{isCurrent && player.isPlaying ? '♪' : index + 1}</span>
                <button
                  className="row-play"
                  title="Play"
                  onClick={() => player.playTracks(tracks, index)}
                >
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
                      <button onClick={() => enrich(track)}>Complete metadata</button>
                      {playlists?.length > 0 && <div className="row-menu-label">Add to playlist</div>}
                      {playlists?.map((playlist) => (
                        <button key={playlist.id} onClick={() => addToPlaylist(playlist.id, track)}>
                          ≡ {playlist.name}
                        </button>
                      ))}
                      {onRemoveFromPlaylist && (
                        <button onClick={() => onRemoveFromPlaylist(track)}>Remove from playlist</button>
                      )}
                      <button className="danger" onClick={() => remove(track)}>
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
  );
}
