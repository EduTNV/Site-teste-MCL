import { useState, useEffect, useRef } from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Repeat1, Settings, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { config } from "@/config";
import { useLocation } from "wouter";
import { getAllImages, getAllSongs } from "@/lib/indexeddb";

interface StoredSettings {
  startDate: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  images: string[];
  customMessage: string;
  songs: Array<{
    title: string;
    artist: string;
    file: string;
  }>;
}

export default function MainPage() {
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [fadeOut, setFadeOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playHistory, setPlayHistory] = useState<number[]>([]);
  const [settings, setSettings] = useState<StoredSettings>({
    startDate: config.startDate,
    images: config.images,
    customMessage: "",
    songs: config.songs,
  });

  // Carregar configurações do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("romanticSiteSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
    }
  }, []);

  // Escutar mudanças no localStorage (quando Settings é atualizado)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("romanticSiteSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Configuração inicial - data de início do relacionamento
  const startDate = new Date(
    settings.startDate.year,
    settings.startDate.month,
    settings.startDate.day,
    settings.startDate.hour,
    settings.startDate.minute,
    0
  );

  // Estado do contador de tempo
  const [timeElapsed, setTimeElapsed] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Carregar configurações
  const images = (settings.images && settings.images.length > 0) ? settings.images : config.images;
  const songs = (settings.songs && settings.songs.length > 0) ? settings.songs : config.songs;

  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // Atualizar contador de tempo a cada segundo
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = now.getTime() - startDate.getTime();

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30.44); // Média de dias por mês
      const years = Math.floor(months / 12);

      setTimeElapsed({
        years: years,
        months: months % 12,
        days: days % 30,
        hours: hours % 24,
        minutes: minutes % 60,
        seconds: seconds % 60,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startDate]);

  // Controle do player de áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    const handleEnded = () => {
      if (repeatMode === "one") {
        // Repetir a mesma música
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === "all" || isShuffleOn) {
        // Repetir todas ou shuffle: tocar próxima
        handleNextSong();
      } else {
        // Modo off: parar no final da playlist
        if (currentSongIndex === songs.length - 1) {
          setIsPlaying(false);
        } else {
          handleNextSong();
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
  }, [currentSongIndex, repeatMode, isShuffleOn, songs.length]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleShuffle = () => {
    setIsShuffleOn(!isShuffleOn);
    setPlayHistory([]);
  };

  const toggleRepeat = () => {
    if (repeatMode === "off") {
      setRepeatMode("all");
    } else if (repeatMode === "all") {
      setRepeatMode("one");
    } else {
      setRepeatMode("off");
    }
  };

  const handlePreviousSong = () => {
    // Se houver histórico e shuffle estiver ativo, voltar para a música anterior do histórico
    if (isShuffleOn && playHistory.length > 0) {
      const previousIndex = playHistory[playHistory.length - 1];
      setPlayHistory((prev) => prev.slice(0, -1));
      setCurrentSongIndex(previousIndex);
    } else {
      // Modo normal: música anterior em sequência
      setCurrentSongIndex((prev) => (prev === 0 ? songs.length - 1 : prev - 1));
    }
    setIsPlaying(false);
  };

  const handleNextSong = () => {
    if (repeatMode === "one") {
      // Repetir a mesma música
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    let nextIndex: number;

    if (isShuffleOn) {
      // Modo shuffle: escolher uma música aleatória diferente da atual
      const availableIndices = songs
        .map((_, index) => index)
        .filter((index) => index !== currentSongIndex);

      if (availableIndices.length > 0) {
        nextIndex =
          availableIndices[Math.floor(Math.random() * availableIndices.length)];
      } else {
        nextIndex = currentSongIndex;
      }
    } else {
      // Modo normal: próxima música em sequência
      nextIndex = currentSongIndex === songs.length - 1 ? 0 : currentSongIndex + 1;
    }

    setPlayHistory((prev) => [...prev, currentSongIndex]);
    setCurrentSongIndex(nextIndex);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const previousImage = () => {
    setFadeOut(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) =>
        prev === 0 ? images.length - 1 : prev - 1
      );
      setFadeOut(false);
    }, 300);
  };

  const nextImage = () => {
    setFadeOut(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) =>
        prev === images.length - 1 ? 0 : prev + 1
      );
      setFadeOut(false);
    }, 300);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Renderizar conteúdo do carrossel
  const CarouselContent = () => (
    <div className="relative w-full h-full bg-black/20 flex items-center justify-center group">
      <img
        src={images[currentImageIndex]}
        alt={`Foto ${currentImageIndex + 1}`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Botões de navegação */}
      <button
        onClick={previousImage}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-all text-base sm:text-lg"
      >
        ←
      </button>
      <button
        onClick={nextImage}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-all text-base sm:text-lg"
      >
        →
      </button>

      {/* Botão de Tela Cheia */}
      {!isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-all opacity-0 group-hover:opacity-100"
          title="Tela cheia"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)] p-3 sm:p-4 flex flex-col">
      {/* Modal de Tela Cheia */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Cabeçalho do Modal */}
          <div className="bg-black/80 backdrop-blur-lg p-4 flex justify-between items-center">
            <h2 className="text-white text-lg font-semibold">
              Foto {currentImageIndex + 1} de {images.length}
            </h2>
            <button
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Conteúdo em Tela Cheia */}
          <div className="flex-1 flex items-center justify-center">
            <CarouselContent />
          </div>

          {/* Indicadores em Tela Cheia */}
          <div className="bg-black/80 backdrop-blur-lg p-4 flex justify-center gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setFadeOut(true);
                  setTimeout(() => {
                    setCurrentImageIndex(index);
                    setFadeOut(false);
                  }, 300);
                }}
                className={`h-2 rounded-full transition-all ${
                  index === currentImageIndex
                    ? "bg-white w-6"
                    : "bg-white/40 w-2"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      {!isFullscreen && (
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-3 flex-1">
          {/* Cabeçalho com botão de Settings */}
          <div className="flex justify-end">
            <Button
              onClick={() => setLocation("/settings")}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 sm:p-3"
              size="icon"
            >
              <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>

          {/* Player de Música - Muito Compacto */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xl">
            <audio ref={audioRef} src={songs[currentSongIndex].file} />

            <div className="space-y-2">
              {/* Informações da música */}
              <div className="text-center">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  {songs[currentSongIndex].title}
                </h2>
                <p className="text-xs text-white/70 truncate">
                  {songs[currentSongIndex].artist}
                </p>
              </div>

              {/* Barra de progresso */}
              <div className="space-y-1">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={(value) => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = value[0];
                    }
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/70">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controles */}
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                {/* Botão Shuffle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleShuffle}
                  className={`text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8 ${
                    isShuffleOn ? "bg-white/20" : ""
                  }`}
                >
                  <Shuffle className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousSong}
                  className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
                >
                  <SkipBack className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                <Button
                  size="icon"
                  onClick={togglePlay}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-[oklch(0.2_0.08_250)] hover:bg-white/90"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextSong}
                  className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
                >
                  <SkipForward className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                {/* Botão Repeat */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRepeat}
                  className={`text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8 ${
                    repeatMode !== "off" ? "bg-white/20" : ""
                  }`}
                >
                  {repeatMode === "one" ? (
                    <Repeat1 className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Repeat className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>

              {/* Controle de volume - Escondido em mobile */}
              <div className="hidden sm:flex items-center gap-2">
                <Volume2 className="h-3 w-3 text-white/70 flex-shrink-0" />
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={(value) => setVolume(value[0])}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Carrossel de Imagens - DESTAQUE PRINCIPAL */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl flex-1 flex flex-col justify-center min-h-0">
            <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden flex-1">
              <CarouselContent />
            </div>

            {/* Indicadores */}
            <div className="flex justify-center gap-1.5 mt-2 sm:mt-3">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setFadeOut(true);
                    setTimeout(() => {
                      setCurrentImageIndex(index);
                      setFadeOut(false);
                    }, 300);
                  }}
                  className={`h-1.5 sm:h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? "bg-white w-5 sm:w-6"
                      : "bg-white/40 w-1.5 sm:w-2"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Contador de Tempo - Uma Linha Compacta */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xl">
            <div className="text-center space-y-1.5">
              <h3 className="text-xs sm:text-sm font-semibold">
                {config.counterText}
              </h3>

              <div className="flex justify-center items-center gap-1.5 sm:gap-2 flex-wrap text-center">
                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.years}
                  </div>
                  <div className="text-xs text-white/70">a</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.months}
                  </div>
                  <div className="text-xs text-white/70">m</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.days}
                  </div>
                  <div className="text-xs text-white/70">d</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.hours}
                  </div>
                  <div className="text-xs text-white/70">h</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.minutes}
                  </div>
                  <div className="text-xs text-white/70">min</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.seconds}
                  </div>
                  <div className="text-xs text-white/70">s</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem Personalizada */}
          {settings.customMessage && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl text-center">
              <p className="text-sm sm:text-base text-white/90 italic">
                {settings.customMessage}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
