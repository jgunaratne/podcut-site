import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import EpisodeList from '../components/EpisodeList.jsx';


function PodcastPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [podcast, setPodcast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const feedUrl = searchParams.get('feedUrl');
  const artworkUrl = searchParams.get('art');
  const artistName = searchParams.get('artist');
  const podcastName = searchParams.get('name');

  useEffect(() => {
    const fetchPodcast = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/podcast/${id}?feedUrl=${encodeURIComponent(feedUrl)}`);
        const data = await res.json();
        // Use artwork from search if feed doesn't have one
        if (!data.image && artworkUrl) data.image = artworkUrl;
        if (!data.author && artistName) data.author = artistName;
        if (!data.title && podcastName) data.title = podcastName;
        setPodcast(data);
      } catch (err) {
        console.error('Fetch podcast error:', err);
      } finally {
        setLoading(false);
      }
    };

    const checkFavorite = async () => {
      try {
        const res = await fetch('/api/favorites');
        const data = await res.json();
        setIsFavorited(data.favorites.some(f => f.collectionId === parseInt(id)));
      } catch { }
    };

    if (feedUrl) {
      fetchPodcast();
      checkFavorite();
    }
  }, [id, feedUrl]);

  const toggleFavorite = async () => {
    try {
      if (isFavorited) {
        await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
        setIsFavorited(false);
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionId: parseInt(id),
            collectionName: podcast.title,
            artistName: podcast.author,
            artworkUrl600: podcast.image,
            feedUrl,
          }),
        });
        setIsFavorited(true);
      }
    } catch (err) {
      console.error('Favorite toggle error:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="podcast-header">
          <div className="loading-skeleton" style={{ width: 220, height: 220, borderRadius: 20 }} />
          <div className="podcast-header-info">
            <div className="loading-skeleton" style={{ width: '60%', height: 32, marginBottom: 16 }} />
            <div className="loading-skeleton" style={{ width: '40%', height: 18, marginBottom: 12 }} />
            <div className="loading-skeleton" style={{ width: '90%', height: 60 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Failed to load podcast</h3>
          <p>The feed may be unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="podcast-header">
        <img src={podcast.image || artworkUrl} alt={podcast.title} className="podcast-header-art" />
        <div className="podcast-header-info">
          <h1>{podcast.title}</h1>
          <div className="author">{podcast.author}</div>
          <div className="description" dangerouslySetInnerHTML={{ __html: podcast.description?.replace(/<[^>]*>/g, '') || '' }} />
          <div className="podcast-actions">
            <button className={`btn ${isFavorited ? 'btn-danger' : 'btn-primary'}`} onClick={toggleFavorite}>
              {isFavorited ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 17.5l-1.4-1.3C3.7 11.8 1 9.3 1 6.3 1 3.8 3 2 5.5 2c1.5 0 2.9.7 3.8 1.7L10 4.5l.7-.8C11.6 2.7 13 2 14.5 2 17 2 19 3.8 19 6.3c0 3-2.7 5.5-7.6 9.9L10 17.5z" />
                  </svg>
                  Unfavorite
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M10 17.5l-1.4-1.3C3.7 11.8 1 9.3 1 6.3 1 3.8 3 2 5.5 2c1.5 0 2.9.7 3.8 1.7L10 4.5l.7-.8C11.6 2.7 13 2 14.5 2 17 2 19 3.8 19 6.3c0 3-2.7 5.5-7.6 9.9L10 17.5z" />
                  </svg>
                  Favorite
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {podcast.episodes?.length > 0 && (
        <EpisodeList
          episodes={podcast.episodes}
          podcast={podcast}
          feedUrl={feedUrl}
          artworkUrl={artworkUrl || podcast.image}
          artistName={artistName || podcast.author}
          podcastName={podcastName || podcast.title}
        />
      )}
    </div>
  );
}

export default PodcastPage;
