import { useState } from 'react';
import { usePlayer } from '../App.jsx';

function TranscriptionPanel({ transcription, loading, onClose, episode, podcast }) {
  const [view, setView] = useState('segments');
  const { seekTo } = usePlayer();
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const handleSeek = (time) => {
    seekTo(time, episode, podcast);
  };

  const handleSummarize = async () => {
    if (summary || summarizing || !transcription?.text) return;
    setSummarizing(true);
    setSummaryError(null);
    try {
      const episodeId = episode?.id || 'unknown';
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId,
          text: transcription.text,
          segments: transcription.segments,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Summarization failed');
      }
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Summary error:', err);
      setSummaryError(err.message);
    } finally {
      setSummarizing(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Simple markdown renderer for summary
  const renderMarkdown = (md) => {
    if (!md) return null;
    const lines = md.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.match(/^### /)) {
        elements.push(<h4 key={i} className="summary-h3">{line.replace(/^### /, '')}</h4>);
      } else if (line.match(/^## /)) {
        elements.push(<h3 key={i} className="summary-h2">{line.replace(/^## /, '')}</h3>);
      } else if (line.match(/^# /)) {
        elements.push(<h2 key={i} className="summary-h1">{line.replace(/^# /, '')}</h2>);
      } else if (line.match(/^[-*] /)) {
        const items = [];
        let j = i;
        while (j < lines.length && lines[j].match(/^[-*] /)) {
          items.push(<li key={j}>{formatInline(lines[j].replace(/^[-*] /, ''))}</li>);
          j++;
        }
        elements.push(<ul key={`ul-${i}`} className="summary-list">{items}</ul>);
        i = j - 1;
      } else if (line.match(/^> /)) {
        elements.push(
          <blockquote key={i} className="summary-quote">
            {formatInline(line.replace(/^> /, ''))}
          </blockquote>
        );
      } else if (line.trim()) {
        elements.push(<p key={i} className="summary-paragraph">{formatInline(line)}</p>);
      }
      i++;
    }
    return elements;
  };

  const parseTimecode = (tc) => {
    // Parse "M:SS" or "MM:SS" or "H:MM:SS" to seconds
    const parts = tc.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const formatInline = (text) => {
    // Split on timecodes like [0:15] or [12:30] or [1:02:15] and bold markers
    const parts = text.split(/(\[\d{1,2}:\d{2}(?::\d{2})?\]|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      const tcMatch = part.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]$/);
      if (tcMatch) {
        const seconds = parseTimecode(tcMatch[1]);
        return (
          <span
            key={i}
            className="summary-timecode"
            onClick={() => handleSeek(seconds)}
          >
            {tcMatch[1]}
          </span>
        );
      }
      return part;
    });
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

  if (!transcription) {
    return (
      <div className="transcription-panel">
        <div className="transcription-content" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <span className="spinner spinner-sm" style={{ marginRight: 8 }} />
          Preparing…
        </div>
      </div>
    );
  }

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
        <button
          className={`transcription-tab ${view === 'summary' ? 'active' : ''}`}
          onClick={() => {
            setView('summary');
            if (!summary && !summarizing) handleSummarize();
          }}
        >
          {summarizing ? 'Summarizing…' : 'Summarize'}
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
        ) : view === 'summary' ? (
          <div className="summary-content">
            {summarizing && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <span className="spinner" style={{ marginBottom: 16, display: 'inline-block' }} />
                <p>Generating summary with Gemini…</p>
              </div>
            )}
            {summaryError && (
              <div className="summary-error">
                <p>Failed to generate summary: {summaryError}</p>
                <button className="btn btn-sm btn-outline" onClick={() => { setSummaryError(null); handleSummarize(); }}>
                  Retry
                </button>
              </div>
            )}
            {summary && (
              <div className="summary-body">
                {renderMarkdown(summary)}
              </div>
            )}
          </div>
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
