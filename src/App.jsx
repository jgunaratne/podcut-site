import { useState, useRef, createContext, useContext, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import AudioPlayer from './components/AudioPlayer.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import SearchPage from './pages/SearchPage.jsx';
import PodcastPage from './pages/PodcastPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import EpisodePage from './pages/EpisodePage.jsx';

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

let toastIdCounter = 0;

function App() {
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [podcastMeta, setPodcastMeta] = useState(null);
  const audioRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [pendingTranscriptions, setPendingTranscriptions] = useState({});

  const playEpisode = (episode, podcast) => {
    setCurrentEpisode(episode);
    setPodcastMeta(podcast);
  };

  const seekTo = (time, episode, podcast) => {
    if (episode && (!currentEpisode || currentEpisode.id !== episode.id)) {
      setCurrentEpisode(episode);
      if (podcast) setPodcastMeta(podcast);
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
      setTimeout(waitForLoad, 50);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play().catch(() => { });
    }
  };

  // Toast system
  const addToast = useCallback((toast) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Global transcription tracker — fires transcription and shows toast on completion
  const startTranscription = useCallback(async (episode, podcast) => {
    if (!episode?.audioUrl || !episode?.id) return;
    if (pendingTranscriptions[episode.id]) return; // already in progress

    setPendingTranscriptions(prev => ({ ...prev, [episode.id]: true }));

    addToast({
      type: 'info',
      title: 'Transcription started',
      message: episode.title,
      duration: 4000,
    });

    try {
      // Check if already transcribed
      const checkRes = await fetch(`/api/transcriptions/${episode.id}`);
      if (checkRes.ok) {
        const data = await checkRes.json();
        setPendingTranscriptions(prev => {
          const next = { ...prev };
          delete next[episode.id];
          return next;
        });
        addToast({
          type: 'success',
          title: 'Transcription ready',
          message: episode.title,
        });
        return data;
      }

      // Request new transcription
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: episode.audioUrl,
          episodeId: episode.id,
          podcastId: podcast?.collectionId,
          episodeTitle: episode.title,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Transcription failed');
      }
      const data = await res.json();

      addToast({
        type: 'success',
        title: 'Transcription complete',
        message: episode.title,
      });

      return data;
    } catch (err) {
      console.error('Transcription error:', err);
      addToast({
        type: 'error',
        title: 'Transcription failed',
        message: `${episode.title} — ${err.message}`,
      });
      return null;
    } finally {
      setPendingTranscriptions(prev => {
        const next = { ...prev };
        delete next[episode.id];
        return next;
      });
    }
  }, [pendingTranscriptions, addToast]);

  return (
    <PlayerContext.Provider value={{
      currentEpisode, podcastMeta, playEpisode, seekTo, audioRef,
      addToast, startTranscription, pendingTranscriptions,
    }}>
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
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </PlayerContext.Provider>
  );
}

export default App;
