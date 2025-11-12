import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
// CORREÇÃO: Adicionado Loader2, que estava em falta na versão anterior
import { ArrowLeft, Upload, Trash2, Music, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { config } from "@/config";
import { supabase, BUCKET_NAME } from "@/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale"; // Importar o locale pt-BR

// CORREÇÃO: Importar os componentes que faltavam
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";


// Tipos de dados
interface StoredSettingsData {
  start_date: string; // Vem do Supabase como texto (ISO String)
  custom_message: string;
}

// CORREÇÃO: Definido o tipo para o estado de Settings
interface SettingsState {
  startDate: Date;
  customMessage: string;
}

type MediaFile = { 
  id: string; 
  name: string; 
  url: string; 
  isImage: boolean;
};

// ID fixo da linha na tabela 'settings'.
const SETTINGS_ID = 1;

export default function Settings() {
  const [, setLocation] = useLocation();
  
  // CORREÇÃO: Restaurada a definição do estado 'settings'
  const [settings, setSettings] = useState<SettingsState>({
    startDate: new Date(config.startDate.year, config.startDate.month, config.startDate.day, config.startDate.hour, config.startDate.minute),
    customMessage: "",
  });

  // CORREÇÃO: Restaurada a definição do estado 'mediaFiles'
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  // Estados locais para UI
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState(1);
  const [minute, setMinute] = useState(0);
  const [message, setMessage] = useState("");
  
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. Carregar Configurações Atuais ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // 1.1. Carregar data e mensagem
      try {
        const { data: settingsData, error } = await supabase
          .from('settings')
          .select('start_date, custom_message')
          .eq('id', SETTINGS_ID)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignora "linha não encontrada"
        
        if (settingsData) {
          const dbDate = new Date(settingsData.start_date);
          // Define os estados separados para os inputs
          setSelectedDate(dbDate);
          setHour(dbDate.getUTCHours()); // Usar UTC para consistência
          setMinute(dbDate.getUTCMinutes());
          setMessage(settingsData.custom_message || "");
          
          // Define o estado 'settings' principal (para salvar)
          setSettings({
            startDate: dbDate,
            customMessage: settingsData.custom_message || ""
          });

        } else {
          // Se não houver dados, usa os padrões do config
          const defaultConfigDate = new Date(
            config.startDate.year, 
            config.startDate.month, 
            config.startDate.day, 
            config.startDate.hour, 
            config.startDate.minute
          );
          setSelectedDate(defaultConfigDate);
          setHour(defaultConfigDate.getHours());
          setMinute(defaultConfigDate.getMinutes());
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast.error("Erro ao carregar configurações. Verifique o RLS da tabela 'settings'.");
      }

      // 1.2. Carregar ficheiros (fotos e músicas)
      try {
        const { data: files, error: filesError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .list();
          
        if (filesError) throw filesError;

        const { data: { publicUrl: BUCKET_URL } } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
        
        const fileList: MediaFile[] = files.map(file => {
          const publicUrl = `${BUCKET_URL}/${encodeURIComponent(file.name)}`;
          const isImage = file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg');
          
          if (isImage) {
            return { id: file.id, name: file.name, url: publicUrl, isImage: true };
          } else {
            const parts = file.name.replace(/\.[^/.]+$/, "").split(' - ');
            const artist = parts.length > 1 ? parts[0].trim() : "Artista desconhecido";
            const title = parts.length > 1 ? parts[1].trim() : parts[0].trim();
            return { id: file.id, name: file.name, title, artist, url: publicUrl, isImage: false };
          }
        }).filter(file => file.name !== '.emptyFolderPlaceholder'); // Ignora ficheiro placeholder

        setMediaFiles(fileList);
        
      } catch (error) {
        console.error("Erro ao carregar mídia:", error);
        toast.error("Erro ao carregar mídia. Verifique o RLS do Storage 'media'.");
      }
      
      setIsLoading(false);
    };

    loadData();
  }, []); // Executa apenas no mount

  // --- 2. Lógica de Salvar Configurações (Data e Mensagem) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); // PREVINE O RECARREGAMENTO DA PÁGINA
    if (!selectedDate || isSaving) return;

    setIsSaving(true);
    const saveToast = toast.loading("A salvar configurações...");

    try {
      // Combina a data do calendário com a hora/minuto dos inputs
      const finalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute);
      
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          id: SETTINGS_ID, // Chave primária
          start_date: finalDate.toISOString(), // Envia em formato ISO (com timezone)
          custom_message: message 
        }, { onConflict: 'id' }); 

      if (error) throw error;
      
      // Atualiza o estado 'settings' local
      setSettings({ startDate: finalDate, customMessage: message });
      toast.success("Configurações salvas com sucesso!", { id: saveToast });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar as configurações.", { id: saveToast });
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. Lógica de Upload de Ficheiros ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'song') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadToast = toast.loading(`Adicionando ${files.length} ficheiro(s)...`);

    let successCount = 0;

    try {
      for (const file of Array.from(files)) {
        let fileName = file.name;
        
        // Formata o nome da música se for um upload de música
        if (fileType === 'song') {
          const title = newSongTitle || file.name.replace(/\.[^/.]+$/, "");
          const artist = newSongArtist || "Artista desconhecido";
          fileName = `${artist} - ${title}.${file.name.split('.').pop()}`;
        }

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, {
            upsert: false // Não sobrescreve ficheiros com o mesmo nome
          });
          
        if (uploadError && !uploadError.message.includes('already exists')) {
          throw uploadError; // Lança o erro se não for "já existe"
        } else if (!uploadError) {
          successCount++;
        }
      }
      
      // Recarregar a lista de mídia após o upload
      if (successCount > 0) {
          const { data: filesList, error: listError } = await supabase.storage.from(BUCKET_NAME).list();
          if (listError) throw listError;
          
          const { data: { publicUrl: BUCKET_URL } } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
          const fileList: MediaFile[] = filesList.map(file => {
              const publicUrl = `${BUCKET_URL}/${encodeURIComponent(file.name)}`;
              const isImage = file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg');
              
              if (isImage) {
                return { id: file.id, name: file.name, url: publicUrl, isImage: true };
              } else {
                const parts = file.name.replace(/\.[^/.]+$/, "").split(' - ');
                const artist = parts.length > 1 ? parts[0].trim() : "Artista desconhecido";
                const title = parts.length > 1 ? parts[1].trim() : parts[0].trim();
                return { id: file.id, name: file.name, title, artist, url: publicUrl, isImage: false };
              }
          }).filter(file => file.name !== '.emptyFolderPlaceholder');
          
          setMediaFiles(fileList); // Atualiza o estado de toda a mídia
          toast.success(`Upload de ${successCount} ficheiro(s) concluído.`, { id: uploadToast });
          
          if (fileType === 'song') {
            setNewSongTitle("");
            setNewSongArtist("");
          }
      } else {
          toast.warning("Nenhum ficheiro novo foi adicionado (talvez já existam).", { id: uploadToast });
      }
      
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error(`Falha no upload: ${(error as Error).message}`, { id: uploadToast });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };
  
  // --- 4. Lógica de Remover Ficheiros ---
  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm(`Tem a certeza que quer remover o ficheiro "${fileName}"?`)) return;

    const deleteToast = toast.loading(`A remover "${fileName}"...`);
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName]);

      if (error) throw error;
      
      // CORREÇÃO: Tipagem explícita para 'f'
      setMediaFiles((prev: MediaFile[]) => prev.filter((f: MediaFile) => f.name !== fileName));
      toast.success(`Ficheiro removido!`, { id: deleteToast });
    } catch (error) {
      console.error("Erro ao remover ficheiro:", error);
      toast.error("Erro ao remover ficheiro.", { id: deleteToast });
    }
  };

  // --- 5. Lógica de Reset ---
  const handleReset = async () => {
    if (!confirm("Tem certeza que deseja apagar TUDO? (Incluindo fotos, músicas e a data)")) return;

    const resetToast = toast.loading("A resetar tudo...");
    try {
      await supabase.from('settings').delete().eq('id', SETTINGS_ID);

      const { data: files } = await supabase.storage.from(BUCKET_NAME).list();
      if (files && files.length > 0) {
        const fileNames = files.map(file => file.name).filter(name => name !== '.emptyFolderPlaceholder');
        if (fileNames.length > 0) {
          await supabase.storage.from(BUCKET_NAME).remove(fileNames);
        }
      }
      
      const defaultConfigDate = new Date(config.startDate.year, config.startDate.month, config.startDate.day, config.startDate.hour, config.startDate.minute);
      
      // CORREÇÃO: Usar setSettings para atualizar o estado
      setSettings({
        startDate: defaultConfigDate,
        customMessage: "",
      });
      setSelectedDate(defaultConfigDate);
      setHour(defaultConfigDate.getHours());
      setMinute(defaultConfigDate.getMinutes());
      setMessage("");
      setMediaFiles([]);

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

  // Listas filtradas para o render
  // CORREÇÃO: Tipagem explícita para 'f'
  const images = mediaFiles.filter((f: MediaFile) => f.isImage);
  const songs = mediaFiles.filter((f: MediaFile) => !f.isImage);

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
          
          {/* Formulário de Data e Mensagem (agora como <form>) */}
          <form onSubmit={handleSave} className="space-y-8">
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
                    onSelect={setSelectedDate}
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
                    <Label htmlFor="hour-input" className="text-white/80 text-sm font-medium">Hora (0-23)</Label>
                    <Input
                      id="hour-input"
                      type="number"
                      value={hour}
                      onChange={(e) => setHour(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                      min="0"
                      max="23"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minute-input" className="text-white/80 text-sm font-medium">Minuto (0-59)</Label>
                    <Input
                      id="minute-input"
                      type="number"
                      value={minute}
                      onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
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

              <Textarea
                value={message}
                // CORREÇÃO: Tipagem explícita para 'e'
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder="Ex: Você é meu amor, minha vida, meu tudo! 💕"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 resize-none h-24"
              />
            </div>

            {/* Botão de Salvar Configurações (Data e Mensagem) */}
            <Button
                type="submit" // Agora funciona dentro do <form>
                className="w-full bg-white text-[oklch(0.2_0.08_250)] hover:bg-white/90 font-semibold py-6 text-lg rounded-lg"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : '💾 Salvar Configurações'}
            </Button>
          </form>

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
                accept="audio/mpeg,audio/wav"
                onChange={(e) => handleFileUpload(e, 'song')}
                className="hidden"
                id="song-upload"
                disabled={isUploading}
              />
              <label htmlFor="song-upload" className={`cursor-pointer block ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? <Loader2 className="h-8 w-8 text-white/70 mx-auto mb-2 animate-spin" /> : <Music className="h-8 w-8 text-white/70 mx-auto mb-2" />}
                <p className="text-white font-medium">{isUploading ? 'A carregar...' : 'Clique para adicionar músicas'}</p>
                <p className="text-white/50 text-sm">ou arraste arquivos aqui (MP3, WAV)</p>
              </label>
            </div>

            {/* Lista de Músicas */}
            {songs.length > 0 && (
              <div className="space-y-3">
                <p className="text-white/80 text-sm font-medium">
                  {songs.length} música{songs.length !== 1 ? "s" : ""} adicionada
                  {songs.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* CORREÇÃO: Tipagem explícita para 'song' */}
                  {songs.map((song: any) => (
                    <div
                      key={song.id}
                      className="bg-white/10 border border-white/20 rounded-lg p-3 flex justify-between items-center group hover:bg-white/15 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{song.title}</p>
                        <p className="text-white/70 text-sm truncate">{song.artist}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(song.name)}
                        className="ml-2 bg-red-500/80 hover:bg-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        disabled={isSaving}
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
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => handleFileUpload(e, 'image')}
                className="hidden"
                id="image-upload"
                disabled={isUploading}
              />
              <label htmlFor="image-upload" className={`cursor-pointer block ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? <Loader2 className="h-8 w-8 text-white/70 mx-auto mb-2 animate-spin" /> : <Upload className="h-8 w-8 text-white/70 mx-auto mb-2" />}
                <p className="text-white font-medium">{isUploading ? 'A carregar...' : 'Clique para adicionar fotos'}</p>
                <p className="text-white/50 text-sm">ou arraste arquivos aqui</p>
              </label>
            </div>

            {/* Galeria de Fotos */}
            {images.length > 0 && (
              <div className="space-y-3">
                <p className="text-white/80 text-sm font-medium">
                  {images.length} foto{images.length !== 1 ? "s" : ""} adicionada
                  {images.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* CORREÇÃO: Tipagem explícita para 'image' */}
                  {images.map((image: any) => (
                    <div key={image.id} className="relative group aspect-video">
                      <img
                        src={image.url}
                        alt="Foto"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeleteFile(image.name)}
                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSaving}
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

          {/* Botão de Resetar */}
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold py-6 text-lg rounded-lg"
            disabled={isSaving || isUploading}
          >
            🔄 Resetar Tudo
          </Button>
        </div>
      </div>
    </div>
  );
}