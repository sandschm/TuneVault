import { normalizeGenre } from './genreNormalizationService.js';

const USER_AGENT = 'TuneVault/1.0 (self-hosted music library)';
const CANDIDATE_LIMIT = 5;
const MINIMUM_SCORE = 0.45;

/** Valid values for the user-selectable provider parameter. */
export const METADATA_PROVIDERS = ['auto', 'itunes', 'deezer', 'musicbrainz'];

/**
 * Looks up track metadata on open APIs. Fetches several candidates per
 * provider, scores them against the track's existing tags (title, artist,
 * duration, album) and returns the best match — or null when nothing scores
 * above the confidence threshold. `provider` narrows the search to a single
 * provider; 'auto' queries all of them and picks the global best.
 */
export async function lookupTrackMetadata(track, provider = 'auto') {
  return findBestMatch(TRACK_PROVIDERS, provider, (candidate) => scoreTrackCandidate(track, candidate), [track]);
}

/**
 * Looks up album metadata (album, album artist, genre, year, cover) the same
 * way: several candidates per provider, scored by album/artist similarity.
 */
export async function lookupAlbumMetadata(albumArtist, album, provider = 'auto') {
  return findBestMatch(
    ALBUM_PROVIDERS,
    provider,
    (candidate) => scoreAlbumCandidate(albumArtist, album, candidate),
    [albumArtist, album],
  );
}

async function findBestMatch(providerMap, provider, score, searchArgs) {
  const providers = provider === 'auto' ? Object.values(providerMap) : [providerMap[provider]].filter(Boolean);
  let best = null;
  for (const search of providers) {
    try {
      for (const candidate of await search(...searchArgs)) {
        const candidateScore = score(candidate);
        if (!best || candidateScore > best.score) {
          best = { candidate, score: candidateScore };
        }
      }
    } catch {
      // Provider unreachable or malformed response — skip it.
    }
  }
  if (!best || best.score < MINIMUM_SCORE) {
    return null;
  }
  const match = best.candidate;
  if (match.resolve) {
    try {
      await match.resolve(match);
    } catch {
      // Detail lookup is best-effort; the candidate's own fields still apply.
    }
    delete match.resolve;
  }
  match.genre = normalizeGenre(match.genre);
  return match;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function normalizeText(text) {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const current = [i];
    for (let j = 1; j < cols; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[cols - 1];
}

/** Normalized string similarity in [0, 1]. */
function similarity(a, b) {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

function durationScore(existingSeconds, candidateSeconds) {
  const difference = Math.abs(existingSeconds - candidateSeconds);
  if (difference <= 3) return 1;
  if (difference <= 10) return 0.5;
  return 0;
}

/** Weighted average over the components we can actually compare. */
function weightedScore(parts) {
  const usable = parts.filter((part) => part !== null);
  const totalWeight = usable.reduce((sum, part) => sum + part.weight, 0);
  if (!totalWeight) return 0;
  return usable.reduce((sum, part) => sum + part.weight * part.score, 0) / totalWeight;
}

function scoreTrackCandidate(track, candidate) {
  return weightedScore([
    { weight: 4, score: similarity(track.title, candidate.title) },
    track.artist && track.artist !== 'Unknown Artist'
      ? { weight: 3, score: similarity(track.artist, candidate.artist) }
      : null,
    track.duration && candidate.duration
      ? { weight: 2, score: durationScore(track.duration, candidate.duration) }
      : null,
    track.album && track.album !== 'Unknown Album' && candidate.album
      ? { weight: 1, score: similarity(track.album, candidate.album) }
      : null,
  ]);
}

function scoreAlbumCandidate(albumArtist, album, candidate) {
  return weightedScore([
    { weight: 3, score: similarity(album, candidate.album) },
    albumArtist && albumArtist !== 'Unknown Artist'
      ? { weight: 2, score: similarity(albumArtist, candidate.albumArtist) }
      : null,
  ]);
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

function searchTerm(track) {
  const artist = track.artist !== 'Unknown Artist' ? track.artist : '';
  return `${artist} ${track.title}`.trim();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

async function searchTrackOnItunes(track) {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', searchTerm(track));
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(CANDIDATE_LIMIT));
  return ((await fetchJson(url)).results ?? []).map((result) => ({
    source: 'iTunes Search API',
    title: result.trackName ?? null,
    artist: result.artistName ?? null,
    albumArtist: result.artistName ?? null,
    album: result.collectionName ?? null,
    genre: result.primaryGenreName ?? null,
    year: result.releaseDate ? new Date(result.releaseDate).getFullYear() : null,
    trackNo: result.trackNumber ?? null,
    duration: result.trackTimeMillis ? result.trackTimeMillis / 1000 : null,
    artworkUrl: result.artworkUrl100?.replace('100x100', '600x600') ?? null,
  }));
}

async function searchTrackOnDeezer(track) {
  const url = new URL('https://api.deezer.com/search/track');
  url.searchParams.set('q', searchTerm(track));
  url.searchParams.set('limit', String(CANDIDATE_LIMIT));
  return ((await fetchJson(url)).data ?? []).map((item) => ({
    source: 'Deezer',
    title: item.title ?? null,
    artist: item.artist?.name ?? null,
    albumArtist: item.artist?.name ?? null,
    album: item.album?.title ?? null,
    genre: null,
    year: null,
    trackNo: null,
    duration: item.duration ?? null,
    artworkUrl: item.album?.cover_big ?? item.album?.cover_medium ?? null,
    // Genre/year live on the album object — fetched only for the winning candidate.
    resolve: async (candidate) => {
      if (!item.album?.id) return;
      const albumDetails = await fetchJson(`https://api.deezer.com/album/${item.album.id}`);
      candidate.genre = albumDetails.genres?.data?.[0]?.name ?? null;
      candidate.year = albumDetails.release_date ? Number(albumDetails.release_date.slice(0, 4)) : null;
    },
  }));
}

async function searchTrackOnMusicBrainz(track) {
  const url = new URL('https://musicbrainz.org/ws/2/recording');
  const artistClause = track.artist !== 'Unknown Artist' ? ` AND artist:"${track.artist}"` : '';
  url.searchParams.set('query', `recording:"${track.title}"${artistClause}`);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(CANDIDATE_LIMIT));
  return ((await fetchJson(url)).recordings ?? []).map((recording) => {
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
      duration: recording.length ? recording.length / 1000 : null,
      artworkUrl: release ? `https://coverartarchive.org/release/${release.id}/front-500` : null,
    };
  });
}

async function searchAlbumOnItunes(albumArtist, album) {
  const url = new URL('https://itunes.apple.com/search');
  const artist = albumArtist !== 'Unknown Artist' ? albumArtist : '';
  url.searchParams.set('term', `${artist} ${album}`.trim());
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'album');
  url.searchParams.set('limit', String(CANDIDATE_LIMIT));
  return ((await fetchJson(url)).results ?? []).map((result) => ({
    source: 'iTunes Search API',
    album: result.collectionName ?? null,
    albumArtist: result.artistName ?? null,
    genre: result.primaryGenreName ?? null,
    year: result.releaseDate ? new Date(result.releaseDate).getFullYear() : null,
    artworkUrl: result.artworkUrl100?.replace('100x100', '600x600') ?? null,
  }));
}

async function searchAlbumOnDeezer(albumArtist, album) {
  const url = new URL('https://api.deezer.com/search/album');
  const artist = albumArtist !== 'Unknown Artist' ? albumArtist : '';
  url.searchParams.set('q', `${artist} ${album}`.trim());
  url.searchParams.set('limit', String(CANDIDATE_LIMIT));
  return ((await fetchJson(url)).data ?? []).map((item) => ({
    source: 'Deezer',
    album: item.title ?? null,
    albumArtist: item.artist?.name ?? null,
    genre: null,
    year: null,
    artworkUrl: item.cover_big ?? item.cover_medium ?? null,
    resolve: async (candidate) => {
      const albumDetails = await fetchJson(`https://api.deezer.com/album/${item.id}`);
      candidate.genre = albumDetails.genres?.data?.[0]?.name ?? null;
      candidate.year = albumDetails.release_date ? Number(albumDetails.release_date.slice(0, 4)) : null;
    },
  }));
}

async function searchAlbumOnMusicBrainz(albumArtist, album) {
  const url = new URL('https://musicbrainz.org/ws/2/release');
  const artistClause = albumArtist !== 'Unknown Artist' ? ` AND artist:"${albumArtist}"` : '';
  url.searchParams.set('query', `release:"${album}"${artistClause}`);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', String(CANDIDATE_LIMIT));
  return ((await fetchJson(url)).releases ?? []).map((release) => ({
    source: 'MusicBrainz',
    album: release.title ?? null,
    albumArtist: release['artist-credit']?.[0]?.name ?? null,
    genre: null,
    year: release.date ? Number(release.date.slice(0, 4)) : null,
    artworkUrl: `https://coverartarchive.org/release/${release.id}/front-500`,
  }));
}

// Auto mode queries providers in this order; the best-scored candidate across
// all of them wins.
const TRACK_PROVIDERS = {
  itunes: searchTrackOnItunes,
  deezer: searchTrackOnDeezer,
  musicbrainz: searchTrackOnMusicBrainz,
};

const ALBUM_PROVIDERS = {
  itunes: searchAlbumOnItunes,
  deezer: searchAlbumOnDeezer,
  musicbrainz: searchAlbumOnMusicBrainz,
};
