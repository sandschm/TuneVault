/**
 * TuneVault stores only English genre names internally. German names — from
 * file tags, external providers or manual edits — are translated on every
 * write path; existing rows are normalized once at startup (see db.js).
 * Unknown genres pass through unchanged (trimmed, whitespace collapsed).
 */
const GENRE_TRANSLATIONS = new Map([
  ['klassik', 'Classical'],
  ['klassische musik', 'Classical'],
  ['oper', 'Opera'],
  ['operette', 'Operetta'],
  ['elektronisch', 'Electronic'],
  ['elektronische musik', 'Electronic'],
  ['elektro', 'Electronic'],
  ['tanzmusik', 'Dance'],
  ['tanz', 'Dance'],
  ['weltmusik', 'World'],
  ['volksmusik', 'Folk'],
  ['volkstümliche musik', 'Folk'],
  ['folklore', 'Folk'],
  ['liedermacher', 'Singer/Songwriter'],
  ['filmmusik', 'Soundtrack'],
  ['soundtracks', 'Soundtrack'],
  ['kinderlieder', "Children's Music"],
  ['kindermusik', "Children's Music"],
  ['hörbuch', 'Audiobook'],
  ['hörspiel', 'Audiobook'],
  ['gesprochenes wort', 'Spoken Word'],
  ['alternativ', 'Alternative'],
  ['christlich & gospel', 'Christian & Gospel'],
  ['religiöse musik', 'Religious'],
  ['country-musik', 'Country'],
  ['blasmusik', 'Brass'],
  ['chormusik', 'Choral'],
  ['gesang', 'Vocal'],
  ['deutschpop', 'German Pop'],
  ['deutschrock', 'German Rock'],
  ['deutscher hip-hop', 'German Hip-Hop'],
  ['sonstiges', 'Other'],
  ['sonstige', 'Other'],
]);

/** Returns the canonical English genre name, or null for empty input. */
export function normalizeGenre(genre) {
  if (genre == null) {
    return null;
  }
  const cleaned = String(genre).replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return null;
  }
  return GENRE_TRANSLATIONS.get(cleaned.toLowerCase()) ?? cleaned;
}

/**
 * One-time (idempotent) data migration: normalizes all stored genres.
 * Returns the number of updated rows.
 */
export function normalizeStoredGenres(db) {
  const rows = db.prepare('SELECT DISTINCT genre FROM tracks WHERE genre IS NOT NULL').all();
  const update = db.prepare('UPDATE tracks SET genre = ? WHERE genre = ?');
  let changed = 0;
  for (const { genre } of rows) {
    const normalized = normalizeGenre(genre);
    if (normalized !== genre) {
      changed += update.run(normalized, genre).changes;
    }
  }
  return changed;
}
