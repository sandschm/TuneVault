import { useCallback, useEffect, useState } from 'react';
import { api, urls } from '../../api.js';
import { usePlayer } from '../../player/PlayerContext.jsx';
import Artwork from '../Artwork.jsx';
import ProviderSelect from '../ProviderSelect.jsx';
import TrackTable from '../TrackTable.jsx';

function formatTotal(seconds) {
  const minutes = Math.round((seconds ?? 0) / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export default function AlbumDetailView({ album, playlists, onNavigate, onLibraryChanged }) {
  const player = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [provider, setProvider] = useState('auto');

  const load = useCallback(() => {
    api.albumTracks(album.albumArtist, album.album).then(setTracks).catch(console.error);
  }, [album]);

  useEffect(load, [load]);

  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0);
  const artworkFile = tracks.find((track) => track.artwork_file)?.artwork_file ?? album.artworkFile;

  const enrichAlbum = async () => {
    try {
      const result = await api.enrichAlbum(album.albumArtist, album.album, provider);
      window.alert(`Metadata for ${result.updatedTracks} songs completed from ${result.source} and saved into the files.`);
      load();
      onLibraryChanged();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const overwriteAlbum = async () => {
    if (
      !window.confirm(
        'Overwrite album name, album artist, genre and year of all songs on this album with looked-up values? Titles, artists and covers stay unchanged.',
      )
    ) {
      return;
    }
    try {
      const result = await api.overwriteAlbum(album.albumArtist, album.album, provider);
      window.alert(`Metadata for ${result.updatedTracks} songs overwritten from ${result.source} and saved into the files.`);
      load();
      onLibraryChanged();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const downloadCover = async () => {
    try {
      const result = await api.downloadAlbumCover(album.albumArtist, album.album, provider);
      window.alert(`Cover downloaded from ${result.source} and embedded into ${result.updatedTracks} files.`);
      load();
      onLibraryChanged();
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div className="view">
      <button className="back-link" onClick={() => onNavigate({ name: 'albums' })}>
        ‹ Albums
      </button>
      <div className="album-header">
        <Artwork artworkFile={artworkFile} size="hero" title={album.album} />
        <div className="album-header-info">
          <h1>{album.album}</h1>
          <div className="album-header-artist">{album.albumArtist}</div>
          <div className="album-header-meta">
            {[album.genre, album.year, `${tracks.length} songs`, formatTotal(totalDuration)]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div className="album-header-actions">
            <button className="primary-button" onClick={() => tracks.length && player.playTracks(tracks, 0)}>
              ▶ Play
            </button>
            <a className="secondary-button" href={urls.downloadAlbum(album.albumArtist, album.album)}>
              ⤓ Download
            </a>
            <ProviderSelect value={provider} onChange={setProvider} />
            <button className="secondary-button" onClick={enrichAlbum}>
              Complete metadata
            </button>
            <button className="secondary-button" onClick={overwriteAlbum}>
              Overwrite metadata
            </button>
            <button className="secondary-button" onClick={downloadCover}>
              Download cover
            </button>
          </div>
        </div>
      </div>
      <TrackTable
        tracks={tracks}
        playlists={playlists}
        showArtwork={false}
        onChanged={() => {
          load();
          onLibraryChanged();
        }}
      />
    </div>
  );
}
