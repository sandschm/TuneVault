import { useEffect, useState } from 'react';
import { urls } from '../api.js';

export default function Artwork({ artworkFile, src, size = 'medium', title = '' }) {
  const imageSrc = src ?? (artworkFile ? urls.artwork(artworkFile) : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [imageSrc]);

  if (imageSrc && !failed) {
    return (
      <img
        className={`artwork artwork-${size}`}
        src={imageSrc}
        alt={title}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`artwork artwork-${size} artwork-placeholder`} aria-label={title}>
      ♪
    </div>
  );
}
