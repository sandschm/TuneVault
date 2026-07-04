const OPTIONS = [
  ['auto', 'Auto (best match)'],
  ['itunes', 'iTunes'],
  ['deezer', 'Deezer'],
  ['musicbrainz', 'MusicBrainz'],
];

/** Choicebox for the metadata source used by Complete/Overwrite/Cover actions. */
export default function ProviderSelect({ value, onChange }) {
  return (
    <select
      className="provider-select"
      title="Metadata source"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {OPTIONS.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
