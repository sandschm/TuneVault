async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  tracks: (params = {}) => request(`/api/tracks?${new URLSearchParams(params)}`),
  updateTrack: (id, fields) => request(`/api/tracks/${id}`, { method: 'PATCH', body: fields }),
  deleteTrack: (id) => request(`/api/tracks/${id}`, { method: 'DELETE' }),
  deleteTracks: (trackIds) => request('/api/tracks/delete-batch', { method: 'POST', body: { trackIds } }),
  enrichTrack: (id, provider = 'auto') =>
    request(`/api/tracks/${id}/enrich`, { method: 'POST', body: { provider } }),
  overwriteTrack: (id, provider = 'auto') =>
    request(`/api/tracks/${id}/overwrite`, { method: 'POST', body: { provider } }),
  downloadTrackCover: (id, provider = 'auto') =>
    request(`/api/tracks/${id}/cover`, { method: 'POST', body: { provider } }),

  albums: (params = {}) => request(`/api/library/albums?${new URLSearchParams(params)}`),
  albumTracks: (albumArtist, album) =>
    request(`/api/library/albums/tracks?${new URLSearchParams({ albumArtist, album })}`),
  artists: () => request('/api/library/artists'),
  genres: () => request('/api/library/genres'),
  stats: () => request('/api/library/stats'),
  home: () => request('/api/library/home'),
  searchLibrary: (query) => request(`/api/library/search?${new URLSearchParams({ q: query })}`),
  updateAlbum: (albumArtist, album, fields) =>
    request('/api/library/albums', { method: 'PATCH', body: { albumArtist, album, fields } }),
  enrichAlbum: (albumArtist, album, provider = 'auto') =>
    request('/api/library/albums/enrich', { method: 'POST', body: { albumArtist, album, provider } }),
  overwriteAlbum: (albumArtist, album, provider = 'auto') =>
    request('/api/library/albums/overwrite', { method: 'POST', body: { albumArtist, album, provider } }),
  downloadAlbumCover: (albumArtist, album, provider = 'auto') =>
    request('/api/library/albums/cover', { method: 'POST', body: { albumArtist, album, provider } }),

  playlists: () => request('/api/playlists'),
  createPlaylist: (name) => request('/api/playlists', { method: 'POST', body: { name } }),
  renamePlaylist: (id, name) => request(`/api/playlists/${id}`, { method: 'PATCH', body: { name } }),
  deletePlaylist: (id) => request(`/api/playlists/${id}`, { method: 'DELETE' }),
  deletePlaylists: (ids) => request('/api/playlists/delete-batch', { method: 'POST', body: { ids } }),
  playlistTracks: (id) => request(`/api/playlists/${id}/tracks`),
  addToPlaylist: (id, trackIds) => request(`/api/playlists/${id}/tracks`, { method: 'POST', body: { trackIds } }),
  removeFromPlaylist: (id, trackId) => request(`/api/playlists/${id}/tracks/${trackId}`, { method: 'DELETE' }),

  uploadFiles: async (files, onProgress) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/uploads');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  },
};

export const urls = {
  stream: (trackId) => `/api/tracks/${trackId}/stream`,
  downloadTrack: (trackId) => `/api/tracks/${trackId}/download`,
  downloadAlbum: (albumArtist, album) =>
    `/api/library/albums/download?${new URLSearchParams({ albumArtist, album })}`,
  downloadPlaylist: (playlistId) => `/api/playlists/${playlistId}/download`,
  artwork: (artworkFile) => `/api/artwork/${artworkFile}`,
  artistImage: (artistName) => `/api/artwork/artist/${encodeURIComponent(artistName)}`,
};
