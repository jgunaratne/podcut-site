import { useState } from 'react';
import { usePlayer } from '../App.jsx';

function TranscriptionPanel({ transcription, loading, onClose, episode, podcast }) {
  const [view, setView] = useState('segments');
  const { seekTo } = usePlayer();

  const handleSeek = (time) => {
    seekTo(time, episode, podcast);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="transcription-panel">
        <div className="transcription-header">
          <h4>
            <span className="spinner spinner-sm" />
            Transcribing…
          </h4>
          <span className="meta">This may take a few minutes for long episodes</span>
        </div>
        <div className="transcription-content" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>Your audio is being processed by the GPU transcription server.</p>
          <p style={{ marginTop: '8px', fontSize: '12px' }}>Jobs are queued and processed one at a time.</p>
        </div>
      </div>
    );
  }

  if (!transcription) return null;

  return (
    <div className="transcription-panel">
      <div className="transcription-header">
        <h4>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--accent-secondary)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 5h14M3 10h10M3 15h12" />
          </svg>
          Transcription
        </h4>
        <span className="meta">
          {transcription.language && `Language: ${transcription.language}`}
          {transcription.duration && ` · ${formatTime(transcription.duration)}`}
          {transcription.processing_time && ` · Processed in ${transcription.processing_time.toFixed(1)}s`}
        </span>
      </div>
      <div className="transcription-tabs">
        <button
          className={`transcription-tab ${view === 'segments' ? 'active' : ''}`}
          onClick={() => setView('segments')}
        >
          Timestamped
        </button>
        <button
          className={`transcription-tab ${view === 'full' ? 'active' : ''}`}
          onClick={() => setView('full')}
        >
          Full Text
        </button>
      </div>
      <div className="transcription-content">
        {view === 'segments' && transcription.segments ? (
          transcription.segments.map((seg, i) => (
            <div key={i} className="segment-item" onClick={() => handleSeek(seg.start)}>
              <span className="segment-time">{formatTime(seg.start)}</span>
              <span className="segment-text">{seg.text}</span>
            </div>
          ))
        ) : (
          <div className="transcription-full-text">
            {transcription.text || 'No transcription text available.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptionPanel;
