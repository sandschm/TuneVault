const LIBRARY_ITEMS = [
  { name: 'songs', label: 'Songs', icon: '♫' },
  { name: 'albums', label: 'Albums', icon: '▦' },
  { name: 'artists', label: 'Artists', icon: '👤' },
  { name: 'genres', label: 'Genres', icon: '♬' },
  { name: 'favorites', label: 'Favorites', icon: '★' },
];

export default function Sidebar({ view, playlists, onNavigate, onCreatePlaylist }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">Library</div>
      {LIBRARY_ITEMS.map((item) => (
        <button
          key={item.name}
          className={`sidebar-item ${view.name === item.name ? 'active' : ''}`}
          onClick={() => onNavigate({ name: item.name })}
        >
          <span className="sidebar-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
      <div className="sidebar-section">
        Playlists
        <button className="sidebar-add" title="New playlist" onClick={onCreatePlaylist}>
          +
        </button>
      </div>
      {playlists.map((playlist) => (
        <button
          key={playlist.id}
          className={`sidebar-item ${view.name === 'playlist' && view.playlist?.id === playlist.id ? 'active' : ''}`}
          onClick={() => onNavigate({ name: 'playlist', playlist })}
        >
          <span className="sidebar-icon">≡</span>
          {playlist.name}
        </button>
      ))}
    </aside>
  );
}
