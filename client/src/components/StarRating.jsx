import { useState } from 'react';

export default function StarRating({ rating, onChange }) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || rating || 0;

  return (
    <span className="stars" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= shown ? 'filled' : ''}`}
          onMouseEnter={() => setHovered(star)}
          onClick={(event) => {
            event.stopPropagation();
            onChange(star === rating ? 0 : star);
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
