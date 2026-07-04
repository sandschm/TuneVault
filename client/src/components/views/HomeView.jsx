import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { usePlayer } from '../../player/PlayerContext.jsx';
import Artwork from '../Artwork.jsx';

/** Horizontal card row of playable tracks. */
function TrackRow({ title, tracks }) {
  const player = usePlayer();
  if (!tracks.length) return null;
  return (
    <section className="home-section">
      <h2>{title}</h2>
      <div className="home-row">
        {tracks.map((track, index) => (
          <button
            key={track.id}
            className="home-card"
            title={`${track.artist} – ${track.title}`}
            onClick={() => player.playTracks(tracks, index)}
          >
            <Artwork artworkFile={track.artwork_file} size="large" title={track.album} />
            <div className="home-card-title">{track.title}</div>
            <div className="home-card-subtitle">{track.artist}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HomeView({ onNavigate }) {
  const [home, setHome] = useState(null);

  useEffect(() => {
    api.home().then(setHome).catch(console.error);
  }, []);

  if (!home) {
    return <div className="view" />;
  }

  const empty =
    !home.recentlyPlayed.length &&
    !home.recentlyAdded.length &&
    !home.recommendations.length &&
    !home.newestPlaylists.length;

  return (
    <div className="view">
      <h1>Home</h1>
      {empty && <div className="empty-state">Your library is empty. Click “+ Add Music” to import files.</div>}

      <TrackRow title="Recently played" tracks={home.recentlyPlayed} />
      <TrackRow title="Recently added" tracks={home.recentlyAdded} />
      <TrackRow title="Recommended for you" tracks={home.recommendations} />

      {home.newestPlaylists.length > 0 && (
        <section className="home-section">
          <h2>Newest playlists</h2>
          <div className="home-row">
            {home.newestPlaylists.map((playlist) => (
              <button
                key={playlist.id}
                className="home-card"
                title={playlist.name}
                onClick={() => onNavigate({ name: 'playlist', playlist })}
              >
                <Artwork artworkFile={playlist.artworkFile} size="large" title={playlist.name} />
                <div className="home-card-title">{playlist.name}</div>
                <div className="home-card-subtitle">{playlist.trackCount} songs</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
