const USER_AGENT = 'TuneVault/1.0 (self-hosted music library)';

/**
 * Looks up track metadata on open APIs. Providers are tried in order;
 * the first one returning a match wins. Both APIs are free and keyless.
 */
export async function lookupTrackMetadata(track) {
  for (const provider of [lookupOnItunes, lookupOnMusicBrainz]) {
    try {
      const match = await provider(track);
      if (match) {
        return match;
      }
    } catch {
      // Provider unreachable or malformed response - fall through to the next one.
    }
  }
  return null;
}

function searchTerm(track) {
  const artist = track.artist !== 'Unknown Artist' ? track.artist : '';
  return `${artist} ${track.title}`.trim();
}

async function lookupOnItunes(track) {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', searchTerm(track));
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    return null;
  }
  const result = (await response.json()).results?.[0];
  if (!result) {
    return null;
  }
  return {
    source: 'iTunes Search API',
    title: result.trackName ?? null,
    artist: result.artistName ?? null,
    albumArtist: result.artistName ?? null,
    album: result.collectionName ?? null,
    genre: result.primaryGenreName ?? null,
    year: result.releaseDate ? new Date(result.releaseDate).getFullYear() : null,
    trackNo: result.trackNumber ?? null,
    artworkUrl: result.artworkUrl100?.replace('100x100', '600x600') ?? null,
  };
}

async function lookupOnMusicBrainz(track) {
  const url = new URL('https://musicbrainz.org/ws/2/recording');
  const artistClause = track.artist !== 'Unknown Artist' ? ` AND artist:"${track.artist}"` : '';
  url.searchParams.set('query', `recording:"${track.title}"${artistClause}`);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    return null;
  }
  const recording = (await response.json()).recordings?.[0];
  if (!recording) {
    return null;
  }
  const release = recording.releases?.[0];
  return {
    source: 'MusicBrainz',
    title: recording.title ?? null,
    artist: recording['artist-credit']?.[0]?.name ?? null,
    albumArtist: recording['artist-credit']?.[0]?.name ?? null,
    album: release?.title ?? null,
    genre: recording.tags?.[0]?.name ?? null,
    year: release?.date ? Number(release.date.slice(0, 4)) : null,
    trackNo: null,
    artworkUrl: release ? `https://coverartarchive.org/release/${release.id}/front-500` : null,
  };
}
