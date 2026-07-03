import { urls } from '../api.js';

export default function Artwork({ artworkFile, size = 'medium', title = '' }) {
  if (artworkFile) {
    return <img className={`artwork artwork-${size}`} src={urls.artwork(artworkFile)} alt={title} loading="lazy" />;
  }
  return (
    <div className={`artwork artwork-${size} artwork-placeholder`} aria-label={title}>
      ♪
    </div>
  );
}
