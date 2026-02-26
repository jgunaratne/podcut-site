import { useState, useEffect } from 'react';
import PodcastCard from '../components/PodcastCard.jsx';

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites');
        const data = await res.json();
        setFavorites(data.favorites || []);
      } catch (err) {
        console.error('Fetch favorites error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  return (
    <div className="page-container">
      <div className="favorites-header">
        <h2>Your Favorites</h2>
        <p>{favorites.length} podcast{favorites.length !== 1 ? 's' : ''} saved</p>
      </div>

      {loading ? (
        <div className="podcast-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="loading-skeleton" style={{ width: '100%', aspectRatio: '1', marginBottom: 8 }} />
              <div className="loading-skeleton" style={{ width: '80%', height: 16, margin: '8px 14px' }} />
              <div className="loading-skeleton" style={{ width: '60%', height: 12, margin: '4px 14px 14px' }} />
            </div>
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <div className="podcast-grid">
          {favorites.map(podcast => (
            <PodcastCard key={podcast.collectionId} podcast={podcast} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M40 57.5l-5.6-5.2C21.5 40.8 14 34 14 25.8 14 19.2 19 14.5 25.5 14.5c3.8 0 7.4 1.8 9.8 4.5l4.7 5 4.7-5c2.4-2.7 6-4.5 9.8-4.5C61 14.5 66 19.2 66 25.8c0 8.2-7.5 15-20.4 26.5L40 57.5z" />
          </svg>
          <h3>No favorites yet</h3>
          <p>Search for podcasts and add them to your favorites</p>
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;
