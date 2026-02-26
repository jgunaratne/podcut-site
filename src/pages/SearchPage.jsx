import { useState, useEffect, useRef } from 'react';
import PodcastCard from '../components/PodcastCard.jsx';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setSearched(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="page-container">
      {!searched && (
        <div className="search-hero">
          <h2>Discover Podcasts</h2>
          <p>Search millions of podcasts, listen to episodes, and get AI-powered transcriptions.</p>
        </div>
      )}
      <div className="search-bar-wrapper">
        <svg className="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="9" cy="9" r="6" />
          <path d="M13.5 13.5L17 17" />
        </svg>
        <input
          type="text"
          className="search-bar"
          placeholder="Search podcasts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {loading && (
          <div className="search-spinner">
            <div className="spinner" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="podcast-grid">
          {results.map(podcast => (
            <PodcastCard key={podcast.collectionId} podcast={podcast} />
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="35" cy="35" r="22" />
            <path d="M50 50l18 18" />
          </svg>
          <h3>No podcasts found</h3>
          <p>Try a different search term</p>
        </div>
      )}
    </div>
  );
}

export default SearchPage;
