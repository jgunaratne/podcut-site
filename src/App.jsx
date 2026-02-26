import { useState, useRef, createContext, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import AudioPlayer from './components/AudioPlayer.jsx';
import SearchPage from './pages/SearchPage.jsx';
import PodcastPage from './pages/PodcastPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import EpisodePage from './pages/EpisodePage.jsx';

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

function App() {
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [podcastMeta, setPodcastMeta] = useState(null);
  const audioRef = useRef(null);

  const playEpisode = (episode, podcast) => {
    setCurrentEpisode(episode);
    setPodcastMeta(podcast);
  };

  const seekTo = (time, episode, podcast) => {
    // If an episode is provided and it's not the current one, load it first
    if (episode && (!currentEpisode || currentEpisode.id !== episode.id)) {
      setCurrentEpisode(episode);
      if (podcast) setPodcastMeta(podcast);
      // Wait for AudioPlayer to load the new source, then seek
      const waitForLoad = () => {
        if (audioRef.current) {
          const onLoaded = () => {
            audioRef.current.currentTime = time;
            audioRef.current.play().catch(() => { });
            audioRef.current.removeEventListener('loadedmetadata', onLoaded);
          };
          audioRef.current.addEventListener('loadedmetadata', onLoaded);
        }
      };
      // Small delay to let React re-render with the new episode
      setTimeout(waitForLoad, 50);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play().catch(() => { });
    }
  };

  return (
    <PlayerContext.Provider value={{ currentEpisode, podcastMeta, playEpisode, seekTo, audioRef }}>
      <div className="app-layout">
        <Navbar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/podcast/:id" element={<PodcastPage />} />
            <Route path="/podcast/:podcastId/episode/:episodeIndex" element={<EpisodePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
        </main>
        <AudioPlayer />
      </div>
    </PlayerContext.Provider>
  );
}

export default App;
