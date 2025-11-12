import { useState, useEffect, useRef } from "react";
import { usePersistFn } from "./usePersistFn";

interface Song {
  title: string;
  artist: string;
  file: string;
}

type RepeatMode = "off" | "all" | "one";

interface UseAudioPlayerReturn {
  // CORREÇÃO: Permitir o tipo null na interface
  audioRef: React.RefObject<HTMLAudioElement | null>; 
  currentSong: Song;
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffleOn: boolean;
  repeatMode: RepeatMode;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  togglePlay: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  handlePreviousSong: () => void;
  handleNextSong: () => void;
  formatTime: (seconds: number) => string;
}

export function useAudioPlayer(songs: Song[]): UseAudioPlayerReturn {
  // CORREÇÃO: Explicitamente tipar useRef para evitar o erro ts(2322)
  const audioRef = useRef<HTMLAudioElement | null>(null); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [playHistory, setPlayHistory] = useState<number[]>([]);

  const currentSong = songs[currentSongIndex] || { title: "Sem música", artist: "Adicione músicas nas configurações", file: "" };

  const formatTime = usePersistFn((seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  });

  const togglePlay = usePersistFn(() => {
    // CORREÇÃO: Verificar se audioRef.current não é null
    if (audioRef.current && songs.length > 0) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
      }
      setIsPlaying(!isPlaying);
    }
  });

  const toggleShuffle = usePersistFn(() => {
    setIsShuffleOn(prev => !prev);
    setPlayHistory([]);
  });

  const toggleRepeat = usePersistFn(() => {
    if (repeatMode === "off") {
      setRepeatMode("all");
    } else if (repeatMode === "all") {
      setRepeatMode("one");
    } else {
      setRepeatMode("off");
    }
  });

  const handleNextSong = usePersistFn((autoPlay = false) => {
    if (songs.length <= 1 && !isShuffleOn) return;

    // CORREÇÃO: Verificar se audioRef.current não é null
    if (repeatMode === "one" && !autoPlay) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    setPlayHistory((prev) => [...prev, currentSongIndex]);
    let nextIndex: number;

    if (isShuffleOn) {
      const resetHistory = playHistory.length >= songs.length - 1 || playHistory.some(i => i >= songs.length);
      const currentHistory = resetHistory ? [] : playHistory;

      const availableIndices = songs
        .map((_, index) => index)
        .filter((index) => index !== currentSongIndex && !currentHistory.includes(index));

      if (availableIndices.length > 0) {
        nextIndex =
          availableIndices[Math.floor(Math.random() * availableIndices.length)];
      } else {
        nextIndex = (currentSongIndex + 1) % songs.length;
      }
      
      if (resetHistory) setPlayHistory([]);
    } else {
      nextIndex = (currentSongIndex + 1) % songs.length;
    }
    
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
  });

  const handlePreviousSong = usePersistFn(() => {
    if (songs.length <= 1) return;
    
    let prevIndex: number;
    if (isShuffleOn && playHistory.length > 0) {
      prevIndex = playHistory[playHistory.length - 1];
      setPlayHistory((prev) => prev.slice(0, -1));
    } else {
      prevIndex = (currentSongIndex === 0 ? songs.length - 1 : currentSongIndex - 1);
    }
    
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
  });
  
  // --- Audio Event Listeners ---
  useEffect(() => {
    const audio = audioRef.current;
    // CORREÇÃO: Guardar apenas se o áudio existir.
    if (!audio || songs.length === 0) return;
    
    // Set the source when currentSongIndex changes
    if (songs[currentSongIndex]) {
        audio.src = songs[currentSongIndex].file; 
        audio.load();
        if (isPlaying) {
            audio.play().catch(e => console.error("Erro ao tocar áudio:", e));
        }
    }

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === "all" || isShuffleOn) {
        handleNextSong(true);
      } else {
        if (currentSongIndex === songs.length - 1) {
          setIsPlaying(false);
          audio.currentTime = 0;
          setCurrentTime(0);
        } else {
          handleNextSong(true);
        }
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSongIndex, songs, repeatMode, isShuffleOn, isPlaying, handleNextSong]);

  // --- Volume Control ---
  useEffect(() => {
    // CORREÇÃO: Verificar se audioRef.current não é null
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, volume) / 100;
    }
  }, [volume]);

  // Handle playing state update when song data changes (e.g., songs array is replaced)
  useEffect(() => {
      if (currentSongIndex >= songs.length && songs.length > 0) {
          setCurrentSongIndex(0);
      }
      if (songs.length === 0) {
          setIsPlaying(false);
      }
  }, [songs.length, currentSongIndex]);

  return {
    audioRef,
    currentSong,
    currentSongIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffleOn,
    repeatMode,
    setVolume,
    togglePlay,
    toggleShuffle,
    toggleRepeat,
    handlePreviousSong,
    handleNextSong,
    formatTime,
  };
}