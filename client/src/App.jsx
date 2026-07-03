import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { useTheme } from './theme.js';
import Sidebar from './components/Sidebar.jsx';
import PlayerBar from './components/PlayerBar.jsx';
import UploadDialog from './components/UploadDialog.jsx';
import SongsView from './components/views/SongsView.jsx';
import AlbumsView from './components/views/AlbumsView.jsx';
import AlbumDetailView from './components/views/AlbumDetailView.jsx';
import ArtistsView from './components/views/ArtistsView.jsx';
import GenresView from './components/views/GenresView.jsx';
import PlaylistView from './components/views/PlaylistView.jsx';

export default function App() {
  const [view, setView] = useState({ name: 'songs' });
  const [playlists, setPlaylists] = useState([]);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const refreshPlaylists = useCallback(() => {
    api.playlists().then(setPlaylists).catch(console.error);
  }, []);

  useEffect(refreshPlaylists, [refreshPlaylists]);

  const refreshLibrary = useCallback(() => {
    setLibraryVersion((version) => version + 1);
    refreshPlaylists();
  }, [refreshPlaylists]);

  const createPlaylist = useCallback(async () => {
    const name = window.prompt('Name of the new playlist:');
    if (!name?.trim()) return;
    const playlist = await api.createPlaylist(name.trim());
    refreshPlaylists();
    setView({ name: 'playlist', playlist });
  }, [refreshPlaylists]);

  const viewProps = {
    key: `${view.name}-${JSON.stringify(view.params ?? '')}-${libraryVersion}`,
    search,
    playlists,
    onNavigate: setView,
    onLibraryChanged: refreshLibrary,
  };

  return (
    <div className="app">
      <PlayerBar
        search={search}
        onSearch={setSearch}
        onUpload={() => setUploadOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="app-body">
        <Sidebar
          view={view}
          playlists={playlists}
          onNavigate={setView}
          onCreatePlaylist={createPlaylist}
        />
        <main className="content">
          {view.name === 'songs' && <SongsView {...viewProps} />}
          {view.name === 'favorites' && <SongsView {...viewProps} favoritesOnly />}
          {view.name === 'albums' && <AlbumsView {...viewProps} filter={view.params} />}
          {view.name === 'album' && <AlbumDetailView {...viewProps} album={view.params} />}
          {view.name === 'artists' && <ArtistsView {...viewProps} />}
          {view.name === 'genres' && <GenresView {...viewProps} />}
          {view.name === 'playlist' && <PlaylistView {...viewProps} playlist={view.playlist} />}
        </main>
      </div>
      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onImported={refreshLibrary}
        />
      )}
    </div>
  );
}
