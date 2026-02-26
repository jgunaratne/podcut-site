import { Link } from 'react-router-dom';

function PodcastCard({ podcast }) {
  return (
    <Link
      to={`/podcast/${podcast.collectionId}?feedUrl=${encodeURIComponent(podcast.feedUrl)}&art=${encodeURIComponent(podcast.artworkUrl600)}&artist=${encodeURIComponent(podcast.artistName)}&name=${encodeURIComponent(podcast.collectionName)}`}
      className="podcast-card"
    >
      <img
        src={podcast.artworkUrl600}
        alt={podcast.collectionName}
        className="podcast-card-art"
        loading="lazy"
      />
      <div className="podcast-card-info">
        <div className="podcast-card-title">{podcast.collectionName}</div>
        <div className="podcast-card-artist">{podcast.artistName}</div>
      </div>
    </Link>
  );
}

export default PodcastCard;
