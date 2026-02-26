import { usePlayer } from '../App.jsx';
import TranscriptionPanel from './TranscriptionPanel.jsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';

function EpisodeList({ episodes, podcast, feedUrl, artworkUrl, artistName, podcastName }) {
  const { currentEpisode, playEpisode, startTranscription, pendingTranscriptions } = usePlayer();
  const [expandedEpisode, setExpandedEpisode] = useState(null);
  const [transcriptions, setTranscriptions] = useState({});

  const handlePlay = (episode) => {
    playEpisode(episode, podcast);
  };

  const handleTranscribe = async (episode) => {
    if (transcriptions[episode.id]) {
      setExpandedEpisode(expandedEpisode === episode.id ? null : episode.id);
      return;
    }

    setExpandedEpisode(episode.id);

    // Check if already transcribed
    try {
      const checkRes = await fetch(`/api/transcriptions/${episode.id}`);
      if (checkRes.ok) {
        const data = await checkRes.json();
        setTranscriptions(prev => ({ ...prev, [episode.id]: data }));
        return;
      }
    } catch { }

    // Use global transcription tracker
    const data = await startTranscription(episode, podcast);
    if (data) {
      setTranscriptions(prev => ({ ...prev, [episode.id]: data }));
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div>
      <div className="episode-list-header">
        Episodes <span className="count">({episodes.length})</span>
      </div>
      {episodes.map((episode, index) => (
        <div key={episode.id}>
          <div className={`episode-item ${currentEpisode?.id === episode.id ? 'playing' : ''}`}>
            <button
              className="episode-play-btn"
              onClick={() => handlePlay(episode)}
              disabled={!episode.audioUrl}
              title={episode.audioUrl ? 'Play' : 'No audio available'}
            >
              {currentEpisode?.id === episode.id ? (
                <svg viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="4" width="3.5" height="12" rx="1" /><rect x="11.5" y="4" width="3.5" height="12" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 4.5v11l10-5.5L6 4.5z" /></svg>
              )}
            </button>
            <div className="episode-info">
              <Link
                to={`/podcast/${podcast.collectionId}/episode/${index}?feedUrl=${encodeURIComponent(feedUrl || '')}&art=${encodeURIComponent(artworkUrl || podcast.image || '')}&artist=${encodeURIComponent(artistName || podcast.author || '')}&name=${encodeURIComponent(podcastName || podcast.title || '')}`}
                className="episode-title episode-title-link"
              >
                {episode.title}
              </Link>
              <div className="episode-meta">
                <span>{formatDate(episode.pubDate)}</span>
                {episode.duration && <span>{episode.duration}</span>}
              </div>
            </div>
            <div className="episode-actions">
              <button
                className={`transcribe-btn ${pendingTranscriptions[episode.id] ? 'loading' : ''} ${transcriptions[episode.id] ? 'done' : ''}`}
                onClick={() => handleTranscribe(episode)}
                disabled={!episode.audioUrl}
              >
                {pendingTranscriptions[episode.id] ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Transcribing…
                  </>
                ) : transcriptions[episode.id] ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 10l4 4 8-8" /></svg>
                    View
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 3v4H3" /><path d="M17 17v-4h4" /><path d="M3 7a8 8 0 0114-1" /><path d="M17 13a8 8 0 01-14 1" />
                    </svg>
                    Transcribe
                  </>
                )}
              </button>
            </div>
          </div>
          {expandedEpisode === episode.id && (
            <TranscriptionPanel
              transcription={transcriptions[episode.id]}
              loading={pendingTranscriptions[episode.id]}
              onClose={() => setExpandedEpisode(null)}
              episode={episode}
              podcast={podcast}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default EpisodeList;
