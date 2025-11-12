import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Repeat1, Settings, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { config } from "@/config";
import { useLocation } from "wouter";
import { getAllImages, getAllSongs } from "@/lib/indexeddb";
import { intervalToDuration } from "date-fns";
import { useAudioPlayer } from "@/hooks/useAudioPlayer"; // Importa o novo hook
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

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
    file: string; // Isto será um Blob URL
  }>;
}

// Guarda os URLs temporários que precisam de ser limpos ao sair da página
let tempBlobUrls: string[] = [];

export default function MainPage() {
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // State para a API do carrossel
  const [mainApi, setMainApi] = useState<CarouselApi | undefined>();
  const [modalApi, setModalApi] = useState<CarouselApi | undefined>();

  const [settings, setSettings] = useState<StoredSettings>({
    startDate: config.startDate,
    images: config.images,
    customMessage: "",
    songs: config.songs,
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Carregar configurações
  const images = settings.images;
  const songs = settings.songs;
  
  // --- INTEGRAÇÃO DO HOOK: Todas as variáveis e funções de áudio vêm daqui ---
  const {
    audioRef,
    currentSong, // Váriavel currentSong é fornecida pelo Hook
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
  } = useAudioPlayer(songs);
  // --------------------------------------------------------------------------
  
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


  // Carregar configurações do localStorage E IndexedDB
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      tempBlobUrls.forEach(URL.revokeObjectURL);
      tempBlobUrls = [];

      let loadedSettings: StoredSettings = {
        startDate: config.startDate,
        images: [...config.images],
        customMessage: "",
        songs: [...config.songs],
      };

      const savedMeta = localStorage.getItem("romanticSiteSettings");
      if (savedMeta) {
        const parsedMeta = JSON.parse(savedMeta);
        loadedSettings = { ...loadedSettings, ...parsedMeta };
      }

      try {
        const dbImages = await getAllImages();
        const dbSongs = await getAllSongs();

        const formattedImages = dbImages.map(img => {
          if (img.data instanceof Blob) {
            const url = URL.createObjectURL(img.data);
            tempBlobUrls.push(url);
            return url;
          }
          return String(img.data);
        });

        const formattedSongs = dbSongs.map(song => {
          const fileUrl = (song.data instanceof Blob) ? URL.createObjectURL(song.data) : String(song.data);
          if (song.data instanceof Blob) tempBlobUrls.push(fileUrl);
          
          return {
            title: song.title,
            artist: song.artist,
            file: fileUrl, 
          };
        });

        if (formattedImages.length > 0) {
          loadedSettings.images = formattedImages;
        }
        
        if (formattedSongs.length > 0) {
          loadedSettings.songs = formattedSongs;
        }
      } catch (error) {
        console.error("Erro ao carregar dados do IndexedDB:", error);
      }

      setSettings(loadedSettings);
      setCurrentImageIndex(0);
      setIsLoading(false);
    }

    loadSettings();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "romanticSiteSettings" || event.key === null) {
        console.log("Storage changed, reloading settings...");
        loadSettings();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      tempBlobUrls.forEach(URL.revokeObjectURL);
      tempBlobUrls = [];
    };

  }, []);


  // --- SINCRONIZAR O CARROSSEL COM O ESTADO ---
  useEffect(() => {
    const onSelect = (api: CarouselApi) => {
      if (!api) return;
      setCurrentImageIndex(api.selectedScrollSnap());
    };
    
    mainApi?.on("select", onSelect);
    if (mainApi) onSelect(mainApi);

    return () => {
      mainApi?.off("select", onSelect);
    };
  }, [mainApi]);

  useEffect(() => {
    const onSelect = (api: CarouselApi) => {
      if (!api) return;
      setCurrentImageIndex(api.selectedScrollSnap());
    };
    
    modalApi?.on("select", onSelect);
    if (modalApi) onSelect(modalApi);

    return () => {
      modalApi?.off("select", onSelect);
    };
  }, [modalApi]);
  // --- FIM DA SINCRONIZAÇÃO ---


  // Atualizar contador de tempo a cada segundo
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      
      if (now.getTime() < startDate.getTime()) {
        setTimeElapsed({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const duration = intervalToDuration({ start: startDate, end: now });

      setTimeElapsed({
        years: duration.years || 0,
        months: duration.months || 0,
        days: duration.days || 0,
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startDate]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Renderizar conteúdo do carrossel (agora usa o componente UI)
  const renderCarousel = ({ isModal = false }: { isModal?: boolean }) => {
    // Verifica se o array de imagens existe e tem itens
    if (!images || images.length === 0) {
      return (
        <div className="w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center group text-white/70 p-4 text-center">
          Nenhuma foto. Adicione algumas na página de Configurações!
        </div>
      );
    }
    
    return (
      <Carousel
        // CORREÇÃO ESTRUTURAL: Aplica classes de layout aqui
        className="w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden group relative"
        setApi={isModal ? setModalApi : setMainApi}
        opts={{
          loop: images.length > 1,
          startIndex: currentImageIndex
        }}
      >
        <CarouselContent className="h-full">
          {images.map((imgSrc, index) => (
            <CarouselItem key={index} className="h-full">
              <img
                src={imgSrc}
                alt={`Foto ${index + 1}`}
                className={`w-full h-full ${isModal ? 'object-contain' : 'object-cover'}`}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Botões de navegação (para arrastar e clicar) */}
        {images.length > 1 && (
          <>
            <CarouselPrevious 
              className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-all ${
                // Se NÃO for modal, fica invisível e aparece no hover
                !isModal && 'opacity-0 group-hover:opacity-100'
              }`} 
            />
            <CarouselNext 
              className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-all ${
                // Se NÃO for modal, fica invisível e aparece no hover
                !isModal && 'opacity-0 group-hover:opacity-100'
              }`} 
            />
          </>
        )}

        {/* Botão de Tela Cheia (apenas no carrossel principal) */}
        {!isModal && (
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
      </Carousel>
    );
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)] flex items-center justify-center">
        <p className="text-white text-xl font-semibold">A carregar...</p>
      </div>
    );
  }

  // **CORREÇÃO: A declaração duplicada foi removida.**
  // const currentSong = songs[currentSongIndex] || { title: "Sem música", artist: "Adicione músicas nas configurações", file: "" };
  
  const safeImageIndex = (currentImageIndex || 0) % (images.length || 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)] p-3 sm:p-4 flex flex-col">
      {/* Modal de Tela Cheia */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Cabeçalho do Modal */}
          <div className="bg-black/80 backdrop-blur-lg p-4 flex justify-between items-center">
            <h2 className="text-white text-lg font-semibold">
              Foto {safeImageIndex + 1} de {images.length || 1}
            </h2>
            <button
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Conteúdo em Tela Cheia */}
          <div className="flex-1 flex items-center justify-center p-4">
            {renderCarousel({ isModal: true })}
          </div>

          {/* Indicadores em Tela Cheia */}
          {images.length > 1 && (
            <div className="bg-black/80 backdrop-blur-lg p-4 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (modalApi) modalApi.scrollTo(index);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === safeImageIndex
                      ? "bg-white w-6"
                      : "bg-white/40 w-2"
                  }`}
                />
              ))}
            </div>
          )}
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
            <audio ref={audioRef} />

            <div className="space-y-2">
              {/* Informações da música */}
              <div className="text-center">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  {currentSong.title}
                </h2>
                <p className="text-xs text-white/70 truncate">
                  {currentSong.artist}
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
                  disabled={songs.length <= 1}
                >
                  <Shuffle className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousSong}
                  className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
                  disabled={songs.length <= 1}
                >
                  <SkipBack className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>

                <Button
                  size="icon"
                  onClick={togglePlay}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-[oklch(0.2_0.08_250)] hover:bg-white/90"
                  disabled={songs.length === 0}
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
                  // CORREÇÃO: Passa o argumento esperado
                  onClick={() => handleNextSong()}
                  className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
                  disabled={songs.length <= 1}
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
                  disabled={songs.length === 0}
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
                  onValueChange={(value: number[]) => setVolume(value[0])}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Carrossel de Imagens - DESTAQUE PRINCIPAL */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl flex-1 flex flex-col justify-center min-h-0">
            {renderCarousel({ isModal: false })}

            {/* Indicadores */}
            {images.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2 sm:mt-3">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (mainApi) mainApi.scrollTo(index);
                    }}
                    className={`h-1.5 sm:h-2 rounded-full transition-all ${
                      index === safeImageIndex
                        ? "bg-white w-5 sm:w-6"
                        : "bg-white/40 w-1.5 sm:w-2"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Contador de Tempo - Uma Linha Compacta */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xl">
            <div className="text-center space-y-1.5">
              <h3 className="text-xs sm:text-sm font-semibold font-romantic">
                {config.counterText}
              </h3>

              <div className="flex justify-center items-center gap-1.5 sm:gap-2 flex-wrap text-center">
                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.years}
                  </div>
                  <div className="text-xs text-white/70">Ano</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.months}
                  </div>
                  <div className="text-xs text-white/70">Mês</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.days}
                  </div>
                  <div className="text-xs text-white/70">Dia</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.hours}
                  </div>
                  <div className="text-xs text-white/70">Hora</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.minutes}
                  </div>
                  <div className="text-xs text-white/70">Min</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-bold">
                    {timeElapsed.seconds}
                  </div>
                  <div className="text-xs text-white/70">Seg</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem Personalizada */}
          {settings.customMessage && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl text-center">
              <p className="text-sm sm:text-base text-white/90 italic font-romantic">
                {settings.customMessage}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}