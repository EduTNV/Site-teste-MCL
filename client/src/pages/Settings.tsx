import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Trash2, Music } from "lucide-react";
import { useLocation } from "wouter";
import {
  saveImage,
  getAllImages,
  deleteImage,
  saveSong,
  getAllSongs,
  deleteSong,
  clearAllData,
} from "@/lib/indexeddb";
import { toast } from "sonner"; // Importa o toast
import { Calendar } from "@/components/ui/calendar"; // Importa o Calendário
import { Input } from "@/components/ui/input"; // Importa o Input
import { config } from "@/config"; // Importa a config padrão

interface StoredSettings {
  startDate: {
    year: number;
    month: number; // 0-11
    day: number;
    hour: number;
    minute: number;
  };
  customMessage: string;
}

// ------ TIPOS PARA OS NOSSOS ESTADOS ------
type ImageState = { id: string; data: string };
type SongState = { id: string; title: string; artist: string; data: string };

// Guarda os URLs temporários para limpar
let tempBlobUrls: string[] = [];

export default function Settings() {
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<StoredSettings>({
    startDate: config.startDate,
    customMessage: "",
  });

  // Estado local para o componente de calendário
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(
      config.startDate.year,
      config.startDate.month,
      config.startDate.day
    )
  );
  
  const [uploadedImages, setUploadedImages] = useState<ImageState[]>([]);
  const [uploadedSongs, setUploadedSongs] = useState<SongState[]>([]);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Função para criar URLs temporários para Blobs (ficheiros)
  const createBlobUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    tempBlobUrls.push(url); // Adiciona ao array para limpeza futura
    return url;
  }

  // Carregar configurações ao montar
  useEffect(() => {
    // Limpa URLs antigos antes de carregar novos
    tempBlobUrls.forEach(URL.revokeObjectURL);
    tempBlobUrls = [];

    const loadData = async () => {
      try {
        // Carregar metadados do localStorage
        const saved = localStorage.getItem("romanticSiteSettings");
        if (saved) {
          const parsed = JSON.parse(saved) as StoredSettings;
          setSettings(parsed);
          setSelectedDate(
            new Date(
              parsed.startDate.year,
              parsed.startDate.month,
              parsed.startDate.day
            )
          );
        } else {
          // Se não houver nada salvo, usa a data padrão
          setSelectedDate(new Date(config.startDate.year, config.startDate.month, config.startDate.day));
        }

        // Carregar imagens do IndexedDB
        const images = await getAllImages();
        const imagesWithUrls = images.map(img => ({
          id: img.id,
          // CORREÇÃO: Verifica se é um Blob (novo) ou string (antigo)
          data: (img.data instanceof Blob) ? createBlobUrl(img.data) : String(img.data) 
        }));
        setUploadedImages(imagesWithUrls);

        // Carregar músicas do IndexedDB
        const songs = await getAllSongs();
        const songsWithUrls = songs.map(song => ({
          ...song,
          // CORREÇÃO: Verifica se é um Blob (novo) ou string (antigo)
          data: (song.data instanceof Blob) ? createBlobUrl(song.data) : String(song.data)
        }));
        setUploadedSongs(songsWithUrls);

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar os seus dados.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Cleanup: Revogar os URLs temporários ao sair da página
    return () => {
      tempBlobUrls.forEach(URL.revokeObjectURL);
      tempBlobUrls = [];
    };
  }, []); // Executa apenas uma vez

  const handleDateSelect = (day: Date | undefined) => {
    if (day) {
      setSelectedDate(day); // Atualiza o UI do calendário
      // Atualiza o estado de 'settings' que será salvo
      setSettings((prev) => ({
        ...prev,
        startDate: {
          ...prev.startDate,
          year: day.getFullYear(),
          month: day.getMonth(), // 0-11
          day: day.getDate(),
        },
      }));
    }
  };

  const handleTimeChange = (field: "hour" | "minute", value: string) => {
    let numValue = parseInt(value) || 0;
    
    // Validação
    if (field === "hour") {
      if (numValue > 23) numValue = 23;
      if (numValue < 0) numValue = 0;
    }
    if (field === "minute") {
      if (numValue > 59) numValue = 59;
      if (numValue < 0) numValue = 0;
    }

    setSettings((prev) => ({
      ...prev,
      startDate: {
        ...prev.startDate,
        [field]: numValue,
      },
    }));
  };

  const handleMessageChange = (message: string) => {
    setSettings((prev) => ({
      ...prev,
      customMessage: message,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Feedback de Upload: Mostra o Toast de carregamento
    const uploadToast = toast.loading(`Adicionando ${files.length} foto(s)...`);

    try {
      const newImages: ImageState[] = [];
      const fileList = Array.from(files); // Converte para Array

      for (const file of fileList) {
        const imageId = `image-${Date.now()}-${Math.random()}`;
        await saveImage(imageId, file); // Salva o Blob
        const imageUrl = createBlobUrl(file); // Cria URL temporário
        newImages.push({ id: imageId, data: imageUrl });
      }

      setUploadedImages((prev) => [...prev, ...newImages]);
      // Feedback de Upload: Mostra o Toast de sucesso
      toast.success("Foto(s) adicionada(s)!", { id: uploadToast });
    } catch (error) {
      console.error("Erro ao fazer upload de imagem:", error);
      // Feedback de Upload: Mostra o Toast de erro
      toast.error("Erro ao adicionar foto(s). Tente novamente.", { id: uploadToast });
    }
  };

  const handleSongUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Feedback de Upload: Mostra o Toast de carregamento
    const uploadToast = toast.loading(`Adicionando ${files.length} música(s)...`);

    try {
      const newSongs: SongState[] = [];
      const fileList = Array.from(files);

      for (const file of fileList) {
        const title = newSongTitle || file.name.replace(/\.[^/.]+$/, "");
        const artist = newSongArtist || "Artista desconhecido";
        const songId = `song-${Date.now()}-${Math.random()}`;

        await saveSong(songId, title, artist, file);

        const songUrl = createBlobUrl(file);
        newSongs.push({ id: songId, title, artist, data: songUrl });
      }

      setUploadedSongs((prev) => [...prev, ...newSongs]);
      setNewSongTitle("");
      setNewSongArtist("");
      // Feedback de Upload: Mostra o Toast de sucesso
      toast.success("Música(s) adicionada(s)!", { id: uploadToast });

    } catch (error) {
      console.error("Erro ao fazer upload de música:", error);
      // Feedback de Upload: Mostra o Toast de erro
      toast.error("Erro ao adicionar música(s). Tente novamente.", { id: uploadToast });
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteImage(id);
      const imageToRemove = uploadedImages.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.data);
      }
      setUploadedImages((prev) => prev.filter((img) => img.id !== id));
      toast.success("Foto removida.");
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      toast.error("Erro ao remover foto.");
    }
  };

  const handleDeleteSong = async (id: string) => {
    try {
      await deleteSong(id);
      const songToRemove = uploadedSongs.find((song) => song.id === id);
      if (songToRemove) {
        URL.revokeObjectURL(songToRemove.data);
      }
      setUploadedSongs((prev) => prev.filter((song) => song.id !== id));
      toast.success("Música removida.");
    } catch (error) {
      console.error("Erro ao deletar música:", error);
      toast.error("Erro ao remover música.");
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem("romanticSiteSettings", JSON.stringify(settings));
      // Dispara um evento de storage para que a MainPage (se aberta) possa atualizar
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "romanticSiteSettings",
          newValue: JSON.stringify(settings),
        })
      ); 
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar as configurações.");
    }
  };

  const handleReset = async () => {
    if (confirm("Tem certeza que deseja apagar TUDO? (Incluindo fotos e músicas)")) {
      try {
        const defaultSettings: StoredSettings = {
          startDate: config.startDate,
          customMessage: "",
        };

        setSettings(defaultSettings);
        setSelectedDate(new Date(config.startDate.year, config.startDate.month, config.startDate.day));
        
        // Limpa URLs temporários
        uploadedImages.forEach(img => URL.revokeObjectURL(img.data));
        uploadedSongs.forEach(song => URL.revokeObjectURL(song.data));

        setUploadedImages([]);
        setUploadedSongs([]);

        localStorage.setItem("romanticSiteSettings", JSON.stringify(defaultSettings));
        await clearAllData();
        
        // Dispara o evento de storage para atualizar a MainPage
        window.dispatchEvent(new StorageEvent("storage", { key: "romanticSiteSettings" }));
        toast.success("Configurações resetadas!");
      } catch (error) {
        console.error("Erro ao resetar:", error);
        toast.error("Erro ao resetar as configurações.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)] p-4 sm:p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl font-semibold">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)] p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">⚙️ Configurações</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/main")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>

        {/* Card de Configurações */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
          {/* Seção de Data */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">📅 Data do Relacionamento</h2>
            <p className="text-white/70 text-sm">Configure a data e hora em que seu relacionamento começou</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Calendário */}
              <div className="flex justify-center bg-white/10 rounded-lg p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="text-white"
                  classNames={{
                    head_cell: "text-white/70",
                    caption_label: "text-white",
                    nav_button: "text-white hover:bg-white/20",
                    day: "text-white hover:bg-white/20",
                    day_selected: "bg-white text-[oklch(0.2_0.08_250)] hover:bg-white/90 focus:bg-white focus:text-[oklch(0.2_0.08_250)]",
                    day_today: "border border-white/50",
                    day_outside: "text-white/30",
                  }}
                />
              </div>

              {/* Inputs de Hora e Minuto */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="hour-input" className="text-white/80 text-sm font-medium">Hora (0-23)</label>
                  <Input
                    id="hour-input"
                    type="number"
                    value={settings.startDate.hour}
                    onChange={(e) => handleTimeChange("hour", e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    min="0"
                    max="23"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="minute-input" className="text-white/80 text-sm font-medium">Minuto (0-59)</label>
                  <Input
                    id="minute-input"
                    type="number"
                    value={settings.startDate.minute}
                    onChange={(e) => handleTimeChange("minute", e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    min="0"
                    max="59"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-white/20"></div>

          {/* Seção de Mensagem Personalizada */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">💌 Mensagem Personalizada</h2>
            <p className="text-white/70 text-sm">Escreva uma mensagem especial que aparecerá na página principal</p>

            <textarea
              value={settings.customMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder="Ex: Você é meu amor, minha vida, meu tudo! 💕"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 resize-none h-24"
            />
          </div>

          {/* Divisor */}
          <div className="border-t border-white/20"></div>

          {/* Seção de Músicas */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">🎵 Playlist Personalizada</h2>
            <p className="text-white/70 text-sm">Adicione suas próprias músicas para o player</p>

            {/* Campos de Título e Artista */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="text"
                value={newSongTitle}
                onChange={(e) => setNewSongTitle(e.target.value)}
                placeholder="Título da música (opcional)"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
              <Input
                type="text"
                value={newSongArtist}
                onChange={(e) => setNewSongArtist(e.target.value)}
                placeholder="Artista (opcional)"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
            </div>

            {/* Upload de Música */}
            <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center hover:border-white/50 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={handleSongUpload}
                className="hidden"
                id="song-upload"
              />
              <label htmlFor="song-upload" className="cursor-pointer block">
                <Music className="h-8 w-8 text-white/70 mx-auto mb-2" />
                <p className="text-white font-medium">Clique para adicionar músicas</p>
                <p className="text-white/50 text-sm">ou arraste arquivos aqui (MP3, WAV, etc)</p>
              </label>
            </div>

            {/* Lista de Músicas */}
            {uploadedSongs.length > 0 && (
              <div className="space-y-3">
                <p className="text-white/80 text-sm font-medium">
                  {uploadedSongs.length} música{uploadedSongs.length !== 1 ? "s" : ""} adicionada
                  {uploadedSongs.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadedSongs.map((song) => (
                    <div
                      key={song.id}
                      className="bg-white/10 border border-white/20 rounded-lg p-3 flex justify-between items-center group hover:bg-white/15 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{song.title}</p>
                        <p className="text-white/70 text-sm truncate">{song.artist}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteSong(song.id)}
                        className="ml-2 bg-red-500/80 hover:bg-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divisor */}
          <div className="border-t border-white/20"></div>

          {/* Seção de Fotos */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">📸 Fotos do Carrossel</h2>
            <p className="text-white/70 text-sm">Adicione fotos para o carrossel (proporção 16:9 recomendada)</p>

            {/* Upload */}
            <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center hover:border-white/50 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer block">
                <Upload className="h-8 w-8 text-white/70 mx-auto mb-2" />
                <p className="text-white font-medium">Clique para adicionar fotos</p>
                <p className="text-white/50 text-sm">ou arraste arquivos aqui</p>
              </label>
            </div>

            {/* Galeria de Fotos */}
            {uploadedImages.length > 0 && (
              <div className="space-y-3">
                <p className="text-white/80 text-sm font-medium">
                  {uploadedImages.length} foto{uploadedImages.length !== 1 ? "s" : ""} adicionada
                  {uploadedImages.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {uploadedImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.data}
                        alt="Foto"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divisor */}
          <div className="border-t border-white/20"></div>

          {/* Botões de Ação */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              onClick={handleSave}
              className="flex-1 bg-white text-[oklch(0.2_0.08_250)] hover:bg-white/90 font-semibold py-6 text-lg rounded-lg"
            >
              💾 Salvar Configurações
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1 border-white/30 text-white hover:bg-white/10 font-semibold py-6 text-lg rounded-lg"
            >
              🔄 Resetar Tudo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}