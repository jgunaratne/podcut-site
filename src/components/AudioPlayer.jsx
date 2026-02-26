import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../App.jsx';

function AudioPlayer() {
  const { currentEpisode, podcastMeta, audioRef } = usePlayer();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef]);

  useEffect(() => {
    if (currentEpisode?.audioUrl && audioRef.current) {
      audioRef.current.src = currentEpisode.audioUrl;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => { });
    }
  }, [currentEpisode, audioRef]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => { });
    }
  };

  const skip = (seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration));
  };

  const handleProgressClick = useCallback((e) => {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  }, [duration, audioRef]);

  const handleVolumeClick = useCallback((e) => {
    if (!volumeRef.current || !audioRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
    audioRef.current.volume = ratio;
  }, [audioRef]);

  const formatTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`audio-player ${currentEpisode ? 'visible' : ''}`}>
      {podcastMeta?.image && (
        <img src={podcastMeta.image} alt="" className="player-art" />
      )}
      <div className="player-info">
        <div className="player-title">{currentEpisode?.title || ''}</div>
        <div className="player-podcast">{podcastMeta?.title || ''}</div>
      </div>

      <div className="player-controls">
        <button className="player-btn" onClick={() => skip(-15)} title="Back 15s">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 105.64-8.36L1 10" />
          </svg>
        </button>
        <button className="player-btn play-pause" onClick={togglePlay}>
          {isPlaying ? (
            <svg viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="3" width="3.5" height="14" rx="1" /><rect x="11.5" y="3" width="3.5" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 3.5v13l11-6.5L6 3.5z" /></svg>
          )}
        </button>
        <button className="player-btn" onClick={() => skip(30)} title="Forward 30s">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 11-5.64-8.36L23 10" />
          </svg>
        </button>
      </div>

      <div className="player-progress-wrapper">
        <span className="player-time">{formatTime(currentTime)}</span>
        <div className="player-progress-bar" ref={progressRef} onClick={handleProgressClick}>
          <div className="player-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
      </div>

      <div className="player-volume">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5h2l4-3.5v10l-4-3.5H3a1 1 0 01-1-1v-1a1 1 0 011-1z" />
          {volume > 0 && <path d="M13 7.5a4 4 0 010 5" />}
          {volume > 0.5 && <path d="M15 5.5a7 7 0 010 9" />}
        </svg>
        <div className="volume-slider" ref={volumeRef} onClick={handleVolumeClick}>
          <div className="volume-fill" style={{ width: `${volume * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
