import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Artwork from '../Artwork.jsx';

export default function GenresView({ search, onNavigate }) {
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    api.genres().then(setGenres).catch(console.error);
  }, []);

  const visible = search
    ? genres.filter((genre) => genre.name.toLowerCase().includes(search.toLowerCase()))
    : genres;

  return (
    <div className="view">
      <h1>Genres</h1>
      {!visible.length && <div className="empty-state">No genres yet.</div>}
      <div className="list-cards">
        {visible.map((genre) => (
          <button
            key={genre.name}
            className="list-card"
            onClick={() => onNavigate({ name: 'albums', params: { genre: genre.name } })}
          >
            <Artwork artworkFile={genre.artworkFile} size="round" title={genre.name} />
            <div className="list-card-body">
              <div className="list-card-title">{genre.name}</div>
              <div className="list-card-subtitle">
                {genre.albumCount} albums · {genre.trackCount} songs
              </div>
            </div>
            <span className="list-card-chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
