import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Trash2, Music, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { config } from "@/config";
import { supabase, BUCKET_NAME } from "@/supabase"; // Importa o Supabase

// Tipos de dados
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
type ImageState = { id: string; name: string; url: string };
type SongState = { id: string; name: string; title: string; artist: string; url: string };

// ID fixo da linha na tabela 'settings'. Como só temos 1 site, usamos 1.
const SETTINGS_ID = 1;

export default function Settings() {
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<StoredSettings>({
    startDate: config.startDate,
    customMessage: "",
  });

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
  const [isUploading, setIsUploading] = useState(false);

  // --- Funções de Carregamento de Dados ---
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading("A carregar configurações...");

    try {
      // Carregar data e mensagem
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('id', SETTINGS_ID) // Seleciona a linha com o ID 1
        .single(); // Espera apenas um resultado

      if (settingsError && settingsError.code !== 'PGRST116') { // Ignora erro "linha não encontrada"
        throw settingsError;
      }
      
      if (settingsData) {
        const dbDate = new Date(settingsData.start_date);
        setSettings({
          startDate: {
            year: dbDate.getFullYear(),
            month: dbDate.getMonth(),
            day: dbDate.getDate(),
            hour: dbDate.getHours(),
            minute: dbDate.getMinutes(),
          },
          customMessage: settingsData.custom_message || "",
        });
        setSelectedDate(dbDate);
      } else {
        // Se não houver dados, usa os padrões
        setSelectedDate(new Date(config.startDate.year, config.startDate.month, config.startDate.day));
      }

      // Carregar ficheiros (fotos e músicas)
      const { data: files, error: filesError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list();
        
      if (filesError) throw filesError;

      const images: ImageState[] = [];
      const songs: SongState[] = [];
      const { data: { publicUrl: BUCKET_URL } } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');

      files.forEach(file => {
        const publicUrl = `${BUCKET_URL}/${file.name}`;
        if (file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
          // Extrai título e artista do nome (ex: "Artista - Titulo.mp3")
          const parts = file.name.replace(/\.[^/.]+$/, "").split(' - ');
          const artist = parts.length > 1 ? parts[0] : "Artista desconhecido";
          const title = parts.length > 1 ? parts[1] : parts[0];
          
          songs.push({ id: file.id, name: file.name, title, artist, url: publicUrl });
        } else if (file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg')) {
          images.push({ id: file.id, name: file.name, url: publicUrl });
        }
      });

      setUploadedImages(images);
      setUploadedSongs(songs);
      
      toast.success("Dados carregados!", { id: loadingToast });

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar os seus dados.", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Funções de Alteração de Dados ---

  const handleDateSelect = (day: Date | undefined) => {
    if (day) {
      setSelectedDate(day);
      setSettings((prev) => ({
        ...prev,
        startDate: {
          ...prev.startDate,
          year: day.getFullYear(),
          month: day.getMonth(),
          day: day.getDate(),
        },
      }));
    }
  };

  const handleTimeChange = (field: "hour" | "minute", value: string) => {
    let numValue = parseInt(value) || 0;
    if (field === "hour" && (numValue > 23 || numValue < 0)) numValue = 0;
    if (field === "minute" && (numValue > 59 || numValue < 0)) numValue = 0;

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

    setIsUploading(true);
    const uploadToast = toast.loading(`Adicionando ${files.length} foto(s)...`);

    try {
      const uploadPromises = Array.from(files).map(file => {
        const fileName = `image-${Date.now()}-${file.name}`;
        return supabase.storage.from(BUCKET_NAME).upload(fileName, file);
      });

      await Promise.all(uploadPromises);
      await loadAllData(); // Recarrega tudo para mostrar os novos ficheiros
      toast.success("Foto(s) adicionada(s)!", { id: uploadToast });

    } catch (error) {
      console.error("Erro no upload da imagem:", error);
      toast.error("Erro ao adicionar foto(s).", { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSongUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadToast = toast.loading(`Adicionando ${files.length} música(s)...`);

    try {
      const uploadPromises = Array.from(files).map(file => {
        const title = newSongTitle || file.name.replace(/\.[^/.]+$/, "");
        const artist = newSongArtist || "Artista desconhecido";
        // Formata o nome para "Artista - Titulo.mp3" para ser fácil de ler
        const fileName = `${artist} - ${title}.${file.name.split('.').pop()}`;
        
        return supabase.storage.from(BUCKET_NAME).upload(fileName, file);
      });

      await Promise.all(uploadPromises);
      await loadAllData(); // Recarrega tudo

      setNewSongTitle("");
      setNewSongArtist("");
      toast.success("Música(s) adicionada(s)!", { id: uploadToast });

    } catch (error) {
      console.error("Erro no upload da música:", error);
      toast.error("Erro ao adicionar música(s).", { id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileName: string, type: "Foto" | "Música") => {
    if (!confirm(`Tem certeza que deseja apagar ${type.toLowerCase()}: "${fileName}"?`)) return;

    const deleteToast = toast.loading(`A remover ${type.toLowerCase()}...`);
    try {
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      await loadAllData(); // Recarrega a lista
      toast.success(`${type} removida!`, { id: deleteToast });
    } catch (error) {
      console.error(`Erro ao deletar ${type}:`, error);
      toast.error(`Erro ao remover ${type.toLowerCase()}.`, { id: deleteToast });
    }
  };


  const handleSave = async () => {
    const saveToast = toast.loading("A salvar configurações...");
    try {
      const { year, month, day, hour, minute } = settings.startDate;
      // Cria a data em formato ISO 8601 (que o Supabase entende)
      const dateString = new Date(year, month, day, hour, minute).toISOString();

      const { error } = await supabase
        .from('settings')
        .upsert({ 
          id: SETTINGS_ID, // Chave primária
          start_date: dateString, 
          custom_message: settings.customMessage 
        });

      if (error) throw error;
      
      toast.success("Configurações salvas com sucesso!", { id: saveToast });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar as configurações.", { id: saveToast });
    }
  };

  const handleReset = async () => {
    if (!confirm("Tem certeza que deseja apagar TUDO? (Incluindo fotos, músicas e a data)")) return;

    const resetToast = toast.loading("A resetar tudo...");
    try {
      // Apaga a linha da tabela de settings
      await supabase.from('settings').delete().eq('id', SETTINGS_ID);

      // Apaga todos os ficheiros do storage
      const { data: files } = await supabase.storage.from(BUCKET_NAME).list();
      if (files && files.length > 0) {
        const fileNames = files.map(file => file.name);
        await supabase.storage.from(BUCKET_NAME).remove(fileNames);
      }
      
      // Reseta o estado local
      setSettings({
        startDate: config.startDate,
        customMessage: "",
      });
      setSelectedDate(new Date(config.startDate.year, config.startDate.month, config.startDate.day));
      setUploadedImages([]);
      setUploadedSongs([]);

      toast.success("Site resetado para os padrões!", { id: resetToast });
    } catch (error) {
      console.error("Erro ao resetar:", error);
      toast.error("Erro ao resetar as configurações.", { id: resetToast });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)] p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
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
                placeholder="Título da música"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              />
              <Input
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
                disabled={isUploading}
              />
              <label htmlFor="song-upload" className={`cursor-pointer block ${isUploading ? 'opacity-50' : ''}`}>
                {isUploading ? <Loader2 className="h-8 w-8 text-white/70 mx-auto mb-2 animate-spin" /> : <Music className="h-8 w-8 text-white/70 mx-auto mb-2" />}
                <p className="text-white font-medium">{isUploading ? 'A carregar...' : 'Clique para adicionar músicas'}</p>
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
                        onClick={() => handleDelete(song.name, "Música")}
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
                disabled={isUploading}
              />
              <label htmlFor="image-upload" className={`cursor-pointer block ${isUploading ? 'opacity-50' : ''}`}>
                {isUploading ? <Loader2 className="h-8 w-8 text-white/70 mx-auto mb-2 animate-spin" /> : <Upload className="h-8 w-8 text-white/70 mx-auto mb-2" />}
                <p className="text-white font-medium">{isUploading ? 'A carregar...' : 'Clique para adicionar fotos'}</p>
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
                        src={image.url}
                        alt="Foto"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDelete(image.name, "Foto")}
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