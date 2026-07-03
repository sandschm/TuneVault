import { useRef, useState } from 'react';
import { api } from '../api.js';

export default function UploadDialog({ onClose, onImported }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (files) => {
    if (!files.length) return;
    setProgress(0);
    setResults(null);
    try {
      const outcome = await api.uploadFiles(files, setProgress);
      setResults(outcome);
      onImported();
    } catch (error) {
      setResults([{ file: 'Upload', status: 'failed', reason: error.message }]);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <h2>Add Music</h2>
          <button className="dialog-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div
          className={`dropzone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            upload([...event.dataTransfer.files]);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="dropzone-icon">♫</div>
          <p>Drop audio files here or click to choose</p>
          <p className="dropzone-hint">MP3, M4A/AAC, FLAC, OGG, WAV</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".mp3,.m4a,.aac,.flac,.ogg,.opus,.wav,audio/*"
            hidden
            onChange={(event) => upload([...event.target.files])}
          />
        </div>

        {progress !== null && (
          <div className="upload-progress">
            <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
            <span>{progress}%</span>
          </div>
        )}

        {results && (
          <ul className="upload-results">
            {results.map((result, index) => (
              <li key={index} className={result.status}>
                <span className="upload-status-icon">
                  {result.status === 'imported' ? '✓' : result.status === 'skipped' ? '⚠' : '✕'}
                </span>
                {result.file}
                {result.reason ? ` — ${result.reason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
