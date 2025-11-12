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

interface StoredSettings {
  startDate: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
  customMessage: string;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<StoredSettings>({
    startDate: {
      year: 2025,
      month: 9,
      day: 4,
      hour: 1,
      minute: 0,
    },
    customMessage: "",
  });

  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; data: string }>>([]);
  const [uploadedSongs, setUploadedSongs] = useState<
    Array<{ id: string; title: string; artist: string; data: string }>
  >([]);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Carregar configurações ao montar
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar metadados do localStorage
        const saved = localStorage.getItem("romanticSiteSettings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
        }

        // Carregar imagens do IndexedDB
        const images = await getAllImages();
        setUploadedImages(images);

        // Carregar músicas do IndexedDB
        const songs = await getAllSongs();
        setUploadedSongs(songs);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDateChange = (field: string, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      startDate: {
        ...prev.startDate,
        [field]: parseInt(String(value)),
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
    if (!files) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = async (event) => {
          const imageData = event.target?.result as string;
          const imageId = `image-${Date.now()}-${i}`;

          await saveImage(imageId, imageData);

          setUploadedImages((prev) => [...prev, { id: imageId, data: imageData }]);
        };

        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Erro ao fazer upload de imagem:", error);
      alert("Erro ao fazer upload da imagem. Tente novamente.");
    }
  };

  const handleSongUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = async (event) => {
          const songData = event.target?.result as string;

          const title = newSongTitle || file.name.replace(/\.[^/.]+$/, "");
          const artist = newSongArtist || "Artista desconhecido";
          const songId = `song-${Date.now()}-${i}`;

          await saveSong(songId, title, artist, songData);

          setUploadedSongs((prev) => [
            ...prev,
            { id: songId, title, artist, data: songData },
          ]);

          setNewSongTitle("");
          setNewSongArtist("");
        };

        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Erro ao fazer upload de música:", error);
      alert("Erro ao fazer upload da música. Tente novamente.");
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      await deleteImage(id);
      setUploadedImages((prev) => prev.filter((img) => img.id !== id));
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      alert("Erro ao deletar a imagem. Tente novamente.");
    }
  };

  const handleDeleteSong = async (id: string) => {
    try {
      await deleteSong(id);
      setUploadedSongs((prev) => prev.filter((song) => song.id !== id));
    } catch (error) {
      console.error("Erro ao deletar música:", error);
      alert("Erro ao deletar a música. Tente novamente.");
    }
  };

  const handleSave = () => {
    try {
      // Salvar apenas metadados no localStorage
      localStorage.setItem("romanticSiteSettings", JSON.stringify(settings));
      alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      alert("Erro ao salvar as configurações. Tente novamente.");
    }
  };

  const handleReset = async () => {
    if (confirm("Tem certeza que deseja resetar as configurações?")) {
      try {
        const defaultSettings: StoredSettings = {
          startDate: {
            year: 2025,
            month: 9,
            day: 4,
            hour: 1,
            minute: 0,
          },
          customMessage: "",
        };

        setSettings(defaultSettings);
        setUploadedImages([]);
        setUploadedSongs([]);

        localStorage.setItem("romanticSiteSettings", JSON.stringify(defaultSettings));
        await clearAllData();

        alert("Configurações resetadas!");
      } catch (error) {
        console.error("Erro ao resetar:", error);
        alert("Erro ao resetar as configurações. Tente novamente.");
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

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Ano */}
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Ano</label>
                <input
                  type="number"
                  value={settings.startDate.year}
                  onChange={(e) => handleDateChange("year", e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  min="2000"
                  max="2100"
                />
              </div>

              {/* Mês */}
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Mês</label>
                <select
                  value={settings.startDate.month}
                  onChange={(e) => handleDateChange("month", e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/40"
                >
                  <option value="0" className="bg-slate-900">
                    Jan
                  </option>
                  <option value="1" className="bg-slate-900">
                    Fev
                  </option>
                  <option value="2" className="bg-slate-900">
                    Mar
                  </option>
                  <option value="3" className="bg-slate-900">
                    Abr
                  </option>
                  <option value="4" className="bg-slate-900">
                    Mai
                  </option>
                  <option value="5" className="bg-slate-900">
                    Jun
                  </option>
                  <option value="6" className="bg-slate-900">
                    Jul
                  </option>
                  <option value="7" className="bg-slate-900">
                    Ago
                  </option>
                  <option value="8" className="bg-slate-900">
                    Set
                  </option>
                  <option value="9" className="bg-slate-900">
                    Out
                  </option>
                  <option value="10" className="bg-slate-900">
                    Nov
                  </option>
                  <option value="11" className="bg-slate-900">
                    Dez
                  </option>
                </select>
              </div>

              {/* Dia */}
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Dia</label>
                <input
                  type="number"
                  value={settings.startDate.day}
                  onChange={(e) => handleDateChange("day", e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  min="1"
                  max="31"
                />
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Hora</label>
                <input
                  type="number"
                  value={settings.startDate.hour}
                  onChange={(e) => handleDateChange("hour", e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  min="0"
                  max="23"
                />
              </div>

              {/* Minuto */}
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Minuto</label>
                <input
                  type="number"
                  value={settings.startDate.minute}
                  onChange={(e) => handleDateChange("minute", e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  min="0"
                  max="59"
                />
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
              <input
                type="text"
                value={newSongTitle}
                onChange={(e) => setNewSongTitle(e.target.value)}
                placeholder="Título da música"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
              <input
                type="text"
                value={newSongArtist}
                onChange={(e) => setNewSongArtist(e.target.value)}
                placeholder="Artista"
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
              🔄 Resetar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
