import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { usePlayer } from '../App.jsx';
import TranscriptionPanel from '../components/TranscriptionPanel.jsx';

function EpisodePage() {
  const { podcastId, episodeIndex } = useParams();
  const [searchParams] = useSearchParams();
  const { currentEpisode, playEpisode, seekTo, startTranscription, pendingTranscriptions } = usePlayer();

  const [podcast, setPodcast] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcription, setTranscription] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const feedUrl = searchParams.get('feedUrl');
  const artworkUrl = searchParams.get('art');
  const artistName = searchParams.get('artist');
  const podcastName = searchParams.get('name');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/podcast/${podcastId}?feedUrl=${encodeURIComponent(feedUrl)}`);
        const data = await res.json();
        if (!data.image && artworkUrl) data.image = artworkUrl;
        if (!data.author && artistName) data.author = artistName;
        if (!data.title && podcastName) data.title = podcastName;
        setPodcast(data);

        const idx = parseInt(episodeIndex);
        if (data.episodes && data.episodes[idx]) {
          setEpisode(data.episodes[idx]);

          // Check for existing transcription
          try {
            const tRes = await fetch(`/api/transcriptions/${data.episodes[idx].id}`);
            if (tRes.ok) {
              const tData = await tRes.json();
              setTranscription(tData);
            }
          } catch { }
        }
      } catch (err) {
        console.error('Fetch episode error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (feedUrl) fetchData();
  }, [podcastId, episodeIndex, feedUrl]);

  const handlePlay = () => {
    if (episode && podcast) playEpisode(episode, podcast);
  };

  const handleTranscribe = async () => {
    if (!episode || transcription) return;
    setTranscribing(true);
    try {
      // Check if already transcribed
      const checkRes = await fetch(`/api/transcriptions/${episode.id}`);
      if (checkRes.ok) {
        const data = await checkRes.json();
        setTranscription(data);
        setTranscribing(false);
        return;
      }

      // Use global transcription tracker
      const data = await startTranscription(episode, podcast);
      if (data) setTranscription(data);
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setTranscribing(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="episode-detail">
          <div className="loading-skeleton" style={{ width: '40%', height: 16, marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 28, marginBottom: 32 }}>
            <div className="loading-skeleton" style={{ width: 180, height: 180, borderRadius: 16, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="loading-skeleton" style={{ width: '80%', height: 28, marginBottom: 12 }} />
              <div className="loading-skeleton" style={{ width: '50%', height: 16, marginBottom: 20 }} />
              <div className="loading-skeleton" style={{ width: '100%', height: 44 }} />
            </div>
          </div>
          <div className="loading-skeleton" style={{ width: '100%', height: 120 }} />
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Episode not found</h3>
          <p>This episode may no longer be available</p>
        </div>
      </div>
    );
  }

  const isPlaying = currentEpisode?.id === episode.id;
  const description = episode.description || '';

  return (
    <div className="page-container">
      <div className="episode-detail">
        {/* Breadcrumb */}
        <Link
          to={`/podcast/${podcastId}?feedUrl=${encodeURIComponent(feedUrl)}&art=${encodeURIComponent(artworkUrl || '')}&artist=${encodeURIComponent(artistName || '')}&name=${encodeURIComponent(podcastName || '')}`}
          className="episode-breadcrumb"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4l-6 6 6 6" />
          </svg>
          {podcast?.title || 'Back to podcast'}
        </Link>

        {/* Header */}
        <div className="episode-detail-header">
          <img
            src={podcast?.image || artworkUrl}
            alt={podcast?.title}
            className="episode-detail-art"
          />
          <div className="episode-detail-info">
            <div className="episode-detail-date">{formatDate(episode.pubDate)}</div>
            <h1 className="episode-detail-title">{episode.title}</h1>
            <div className="episode-detail-podcast-name">{podcast?.title}</div>
            {episode.duration && (
              <div className="episode-detail-duration">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="10" cy="10" r="8" /><path d="M10 6v4l2.5 2.5" />
                </svg>
                {episode.duration}
              </div>
            )}
            <div className="episode-detail-actions">
              <button className="btn btn-primary" onClick={handlePlay}>
                {isPlaying ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="3" width="3.5" height="14" rx="1" /><rect x="11.5" y="3" width="3.5" height="14" rx="1" /></svg>
                    Now Playing
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M6 3.5v13l11-6.5L6 3.5z" /></svg>
                    Play Episode
                  </>
                )}
              </button>
              <button
                className={`btn ${transcription ? 'btn-outline done' : transcribing ? 'btn-outline' : 'btn-outline'}`}
                onClick={handleTranscribe}
                disabled={!episode.audioUrl || transcribing}
              >
                {transcribing ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Transcribing…
                  </>
                ) : transcription ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round"><path d="M4 10l4 4 8-8" /></svg>
                    Transcribed
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 3v4H3" /><path d="M17 17v-4h4" /><path d="M3 7a8 8 0 0114-1" /><path d="M17 13a8 8 0 01-14 1" />
                    </svg>
                    Transcribe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="episode-detail-section">
            <h3 className="episode-detail-section-title">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 5h14M3 10h10M3 15h7" />
              </svg>
              Episode Notes
            </h3>
            <div
              className={`episode-detail-description ${showFullDesc ? 'expanded' : ''}`}
              dangerouslySetInnerHTML={{ __html: description }}
            />
            {description.length > 400 && (
              <button className="episode-desc-toggle" onClick={() => setShowFullDesc(!showFullDesc)}>
                {showFullDesc ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Transcription */}
        {(transcription || transcribing || (episode && pendingTranscriptions[episode.id])) && (
          <div className="episode-detail-section">
            <h3 className="episode-detail-section-title">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 5h14M3 10h10M3 15h12" />
              </svg>
              Transcription
            </h3>
            <TranscriptionPanel
              transcription={transcription}
              loading={transcribing}
              onClose={() => { }}
              episode={episode}
              podcast={podcast}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default EpisodePage;
