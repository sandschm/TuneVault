import { usePlayer } from '../player/PlayerContext.jsx';
import Artwork from './Artwork.jsx';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export default function PlayerBar({ search, onSearch, onUpload, theme, onToggleTheme }) {
  const player = usePlayer();
  const { currentTrack, isPlaying, progress, duration } = player;

  return (
    <header className="player-bar">
      <div className="player-controls">
        <button
          className={`control-button small ${player.shuffle ? 'accent' : ''}`}
          title="Shuffle"
          onClick={player.toggleShuffle}
        >
          ⤨
        </button>
        <button className="control-button" title="Previous" onClick={player.previous}>
          ◀◀
        </button>
        <button className="control-button play" title="Play / Pause" onClick={player.togglePlay}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button className="control-button" title="Next" onClick={player.next}>
          ▶▶
        </button>
        <button
          className={`control-button small ${player.repeat ? 'accent' : ''}`}
          title="Repeat"
          onClick={player.toggleRepeat}
        >
          ⟲
        </button>
        <input
          className="volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={player.volume}
          title="Volume"
          onChange={(event) => player.setVolume(Number(event.target.value))}
        />
      </div>

      <div className="lcd">
        {currentTrack ? (
          <>
            <Artwork artworkFile={currentTrack.artwork_file} size="mini" title={currentTrack.album} />
            <div className="lcd-body">
              <div className="lcd-title">{currentTrack.title}</div>
              <div className="lcd-subtitle">
                {currentTrack.artist} — {currentTrack.album}
              </div>
              <div className="lcd-progress">
                <span className="lcd-time">{formatTime(progress)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={progress}
                  onChange={(event) => player.seek(Number(event.target.value))}
                />
                <span className="lcd-time">-{formatTime(Math.max(0, duration - progress))}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="lcd-idle">♪ TuneVault</div>
        )}
      </div>

      <div className="player-right">
        <input
          className="search"
          type="search"
          placeholder="Search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
        <button className="upload-button" onClick={onUpload}>
          + Add Music
        </button>
        <button
          className="theme-toggle"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
