import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { urls } from '../api.js';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;

  const playAt = useCallback((tracks, index) => {
    setQueue(tracks);
    setCurrentIndex(index);
    const audio = audioRef.current;
    audio.src = urls.stream(tracks[index].id);
    audio.play();
  }, []);

  const next = useCallback(() => {
    setQueue((tracks) => {
      setCurrentIndex((index) => {
        if (!tracks.length) return index;
        let nextIndex;
        if (shuffle && tracks.length > 1) {
          do {
            nextIndex = Math.floor(Math.random() * tracks.length);
          } while (nextIndex === index);
        } else {
          nextIndex = index + 1;
          if (nextIndex >= tracks.length) {
            if (!repeat) return index;
            nextIndex = 0;
          }
        }
        const audio = audioRef.current;
        audio.src = urls.stream(tracks[nextIndex].id);
        audio.play();
        return nextIndex;
      });
      return tracks;
    });
  }, [shuffle, repeat]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio.currentTime > 3 || currentIndex <= 0) {
      audio.currentTime = 0;
      return;
    }
    playAt(queue, currentIndex - 1);
  }, [queue, currentIndex, playAt]);

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => next();
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [next]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const value = useMemo(
    () => ({
      queue,
      currentTrack,
      isPlaying,
      progress,
      duration,
      volume,
      shuffle,
      repeat,
      playTracks: playAt,
      togglePlay: () => {
        const audio = audioRef.current;
        if (!currentTrack) return;
        if (audio.paused) audio.play();
        else audio.pause();
      },
      next,
      previous,
      seek: (seconds) => {
        audioRef.current.currentTime = seconds;
      },
      setVolume: setVolumeState,
      toggleShuffle: () => setShuffle((value) => !value),
      toggleRepeat: () => setRepeat((value) => !value),
    }),
    [queue, currentTrack, isPlaying, progress, duration, volume, shuffle, repeat, playAt, next, previous],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
