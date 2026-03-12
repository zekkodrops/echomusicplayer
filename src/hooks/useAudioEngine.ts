import { useEffect, useMemo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { tauriApi } from '../lib/tauri';

export function useAudioEngine() {
  const {
    queue, currentIndex, isPlaying, volume, muted, position,
    setPosition, playNext,
  } = usePlayerStore();

  const current = queue[currentIndex];
  const audio = useMemo(() => new Audio(), []);

  useEffect(() => {
    if (!current) return;
    audio.src = current.path;
    audio.currentTime = position;
    if (isPlaying) audio.play().catch(() => null);
    tauriApi.incrementPlay(current.id).catch(() => null);
  }, [audio, current]);

  useEffect(() => {
    audio.volume = muted ? 0 : volume;
  }, [audio, volume, muted]);

  useEffect(() => {
    if (isPlaying) audio.play().catch(() => null);
    else audio.pause();
  }, [audio, isPlaying]);

  useEffect(() => {
    const onTime = () => setPosition(audio.currentTime);
    const onEnded = () => playNext();
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [audio, playNext, setPosition]);

  return { audio, current };
}
