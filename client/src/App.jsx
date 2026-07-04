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
import PlaylistsManageView from './components/views/PlaylistsManageView.jsx';
import SearchView from './components/views/SearchView.jsx';
import HomeView from './components/views/HomeView.jsx';

export default function App() {
  const [view, setView] = useState({ name: 'home' });
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
    setSearch('');
    setView({ name: 'playlist', playlist });
  }, [refreshPlaylists]);

  const navigate = useCallback((nextView) => {
    setSearch('');
    setView(nextView);
  }, []);

  const viewProps = {
    key: `${view.name}-${JSON.stringify(view.params ?? '')}-${libraryVersion}`,
    playlists,
    onNavigate: navigate,
    onLibraryChanged: refreshLibrary,
  };

  const searching = search.trim().length > 0;

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
          onNavigate={navigate}
          onCreatePlaylist={createPlaylist}
        />
        <main className="content">
          {searching && <SearchView {...viewProps} key={`search-${libraryVersion}`} search={search.trim()} />}
          {!searching && view.name === 'home' && <HomeView {...viewProps} />}
          {!searching && view.name === 'songs' && <SongsView {...viewProps} />}
          {!searching && view.name === 'favorites' && <SongsView {...viewProps} favoritesOnly />}
          {!searching && view.name === 'artist' && <SongsView {...viewProps} artist={view.params.artist} />}
          {!searching && view.name === 'albums' && <AlbumsView {...viewProps} filter={view.params} />}
          {!searching && view.name === 'album' && <AlbumDetailView {...viewProps} album={view.params} />}
          {!searching && view.name === 'artists' && <ArtistsView {...viewProps} />}
          {!searching && view.name === 'genres' && <GenresView {...viewProps} />}
          {!searching && view.name === 'playlists' && <PlaylistsManageView {...viewProps} />}
          {!searching && view.name === 'playlist' && <PlaylistView {...viewProps} playlist={view.playlist} />}
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
