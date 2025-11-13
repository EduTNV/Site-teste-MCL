import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, X, UploadCloud, Image as ImageIcon, ArrowLeft, Trash2, Music } from "lucide-react";
import { toast } from "sonner"; // CORREÇÃO: Importando 'toast' de 'sonner'
import { supabase, BUCKET_NAME } from "@/supabase";
import { config } from "@/config";
import { useLocation } from "wouter";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// IMPORTAÇÕES CORRIGIDAS PARA O EDITOR DE IMAGEM
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop, // CORREÇÃO: 'makeAspectCrop' com 'm' minúsculo
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
// Vamos precisar criar este arquivo na próxima etapa
// import { canvasPreview } from '@/lib/canvasPreview'; 

// --- Copiado do seu client/src/lib/utils.ts, pois não podemos importar canvasPreview ainda ---
// --- INÍCIO: canvasPreview ---
const TO_RADIANS = Math.PI / 180;
async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: Crop,
  scale = 1,
  rotate = 0,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No 2d context');
  }
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';
  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const rotateRads = rotate * TO_RADIANS;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;
  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image, 0, 0, image.naturalWidth, image.naturalHeight,
    0, 0, image.naturalWidth, image.naturalHeight,
  );
  ctx.restore();
}
// --- FIM: canvasPreview ---


// Função auxiliar para centralizar o recorte
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}
// --- Fim das funções auxiliares do editor ---


// Tipos de dados
interface StoredSettingsData {
  start_date: string;
  custom_message: string;
}

interface SettingsState {
  startDate: Date;
  customMessage: string;
}

type MediaFile = { 
  id: string; 
  name: string; 
  url: string; 
  isImage: boolean;
  title?: string; // Para musicas
  artist?: string; // Para musicas
};

const SETTINGS_ID = 1; // ID fixo da linha na tabela 'settings'.

export default function Settings() {
  const [, setLocation] = useLocation();
  
  const [settings, setSettings] = useState<SettingsState>({
    startDate: new Date(config.startDate.year, config.startDate.month, config.startDate.day, config.startDate.hour, config.startDate.minute),
    customMessage: "",
  });

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

  // ESTADOS PARA O EDITOR DE IMAGEM
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrcToCrop, setImageSrcToCrop] = useState<string>('');
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);


  // --- 1. Carregar Configurações Atuais ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const { data: settingsData, error } = await supabase
          .from('settings')
          .select('start_date, custom_message')
          .eq('id', SETTINGS_ID)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (settingsData) {
          const dbDate = new Date(settingsData.start_date);
          setSelectedDate(dbDate);
          setHour(dbDate.getUTCHours());
          setMinute(dbDate.getUTCMinutes());
          setMessage(settingsData.custom_message || "");
          setSettings({
            startDate: dbDate,
            customMessage: settingsData.custom_message || ""
          });
        } else {
          const defaultConfigDate = new Date(
            config.startDate.year, config.startDate.month, config.startDate.day, 
            config.startDate.hour, config.startDate.minute
          );
          setSelectedDate(defaultConfigDate);
          setHour(defaultConfigDate.getHours());
          setMinute(defaultConfigDate.getMinutes());
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast.error("Erro ao carregar configurações.");
      }

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
        }).filter(file => file.name !== '.emptyFolderPlaceholder');

        setMediaFiles(fileList);
        
      } catch (error) {
        console.error("Erro ao carregar mídia:", error);
        toast.error("Erro ao carregar mídia.");
      }
      
      setIsLoading(false);
    };

    loadData();
  }, []); // Executa apenas no mount

  // --- 2. Lógica de Salvar Configurações (Data e Mensagem) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || isSaving) return;

    setIsSaving(true);
    const saveToast = toast.loading("Salvando configurações...");

    try {
      const finalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute);
      
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          id: SETTINGS_ID,
          start_date: finalDate.toISOString(),
          custom_message: message 
        }, { onConflict: 'id' }); 

      if (error) throw error;
      
      setSettings({ startDate: finalDate, customMessage: message });
      toast.success("Configurações salvas com sucesso!", { id: saveToast });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar as configurações.", { id: saveToast });
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. Lógica de Upload de Músicas (Direto) ---
  const handleSongUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadToast = toast.loading(`Adicionando ${files.length} música(s)...`);

    try {
      const file = files[0];
      const title = newSongTitle || file.name.replace(/\.[^/.]+$/, "");
      const artist = newSongArtist || "Artista desconhecido";
      const fileName = `${artist} - ${title}.${file.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          upsert: false
        });
        
      if (uploadError && !uploadError.message.includes('already exists')) {
        throw uploadError;
      } else if (!uploadError) {
        // Recarregar lista
        await reloadMediaFiles();
        toast.success(`Música adicionada!`, { id: uploadToast });
        setNewSongTitle("");
        setNewSongArtist("");
      } else {
        toast.warning("Essa música já existe.", { id: uploadToast });
      }
      
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error(`Falha no upload: ${(error as Error).message}`, { id: uploadToast });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };
  
  // --- 4. Lógica de Upload de Imagem (Abrir Editor) ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione um arquivo de imagem.");
        return;
      }
      setSelectedFile(file);
      setImageSrcToCrop(URL.createObjectURL(file));
      setCrop(undefined);
      setIsCropDialogOpen(true);
      e.target.value = ""; // Limpa o input para permitir selecionar o mesmo arquivo
    }
  };

  // --- 5. Lógica de Recortar e Enviar Imagem ---
  const handleCropAndUpload = async () => {
    if (!selectedFile || !completedCrop || !imgRef.current || !previewCanvasRef.current) {
      toast.error("Erro de recorte", { description: "Não foi possível aplicar o recorte da imagem." });
      return;
    }

    setIsUploading(true);
    const uploadToast = toast.loading("Recortando e enviando imagem...");

    try {
      // 1. Criar o blob da imagem recortada
      await canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
      const croppedImageBlob = await new Promise<Blob | null>((resolve) => {
        previewCanvasRef.current!.toBlob((blob) => {
          resolve(blob);
        }, selectedFile.type, 0.95); // Qualidade 95%
      });

      if (!croppedImageBlob) {
        throw new Error("Falha ao criar imagem recortada.");
      }

      // 2. Upload para o Supabase
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-cropped.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, croppedImageBlob, {
          upsert: false,
          contentType: croppedImageBlob.type
        });

      if (uploadError) throw uploadError;

      // 3. Atualizar lista de mídia
      await reloadMediaFiles();
      toast.success("Imagem enviada com sucesso!", { id: uploadToast });

      // 4. Limpar estados
      setIsCropDialogOpen(false);
      setSelectedFile(null);
      setImageSrcToCrop('');
      setCrop(undefined);
      setCompletedCrop(undefined);

    } catch (err) {
      console.error("Erro ao recortar e enviar imagem:", err);
      toast.error("Erro ao enviar imagem", { description: (err as Error).message, id: uploadToast });
    } finally {
      setIsUploading(false);
    }
  };

  // --- 6. Lógica de Remover Ficheiros ---
  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm(`Tem a certeza que quer remover "${fileName}"?`)) return;

    const deleteToast = toast.loading(`Removendo "${fileName}"...`);
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName]);

      if (error) throw error;
      
      setMediaFiles((prev) => prev.filter((f) => f.name !== fileName));
      toast.success(`Ficheiro removido!`, { id: deleteToast });
    } catch (error) {
      console.error("Erro ao remover ficheiro:", error);
      toast.error("Erro ao remover ficheiro.", { id: deleteToast });
    }
  };
  
  // --- 7. Lógica de Reset ---
  const handleReset = async () => {
    if (!confirm("Tem certeza que deseja apagar TUDO? (Incluindo fotos, músicas e a data)")) return;

    const resetToast = toast.loading("Resetando tudo...");
    try {
      // Apaga dados da tabela
      await supabase.from('settings').delete().eq('id', SETTINGS_ID);

      // Apaga arquivos do storage
      const { data: files } = await supabase.storage.from(BUCKET_NAME).list();
      if (files && files.length > 0) {
        const fileNames = files.map(file => file.name).filter(name => name !== '.emptyFolderPlaceholder');
        if (fileNames.length > 0) {
          await supabase.storage.from(BUCKET_NAME).remove(fileNames);
        }
      }
      
      // Reseta o estado local
      const defaultConfigDate = new Date(config.startDate.year, config.startDate.month, config.startDate.day, config.startDate.hour, config.startDate.minute);
      setSettings({ startDate: defaultConfigDate, customMessage: "" });
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

  // --- Função Auxiliar para Recarregar Mídia ---
  const reloadMediaFiles = async () => {
    try {
      const { data: files, error: filesError } = await supabase.storage.from(BUCKET_NAME).list();
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
      }).filter(file => file.name !== '.emptyFolderPlaceholder');

      setMediaFiles(fileList);
    } catch (error) {
      console.error("Erro ao recarregar mídia:", error);
      toast.error("Erro ao atualizar a lista de mídia.");
    }
  };

  // --- Efeito para gerar o preview do crop ---
  useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
      canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
    }
  }, [completedCrop]);

  // Handler para quando a imagem é carregada no editor de crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const aspect = 16 / 9; // Proporção do carrossel
    setCrop(centerAspectCrop(width, height, aspect));
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.2_0.08_250)] to-[oklch(0.15_0.06_260)] p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  const images = mediaFiles.filter((f) => f.isImage);
  const songs = mediaFiles.filter((f) => !f.isImage);

  return (
    <>
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
            
            <form onSubmit={handleSave} className="space-y-8">
              {/* Seção de Data */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">📅 Data Início</h2>
                <p className="text-white/70 text-sm">Configure a data e hora do início.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="flex justify-center bg-white/10 rounded-lg p-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={`
                            w-full justify-start text-left font-normal bg-transparent border-0
                            text-white hover:bg-white/20 hover:text-white
                            ${!selectedDate && "text-white/60"}
                          `}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : <span>Escolha uma data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-white">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          locale={ptBR}
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
                      </PopoverContent>
                    </Popover>
                  </div>

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

              <div className="border-t border-white/20"></div>

              {/* Seção de Mensagem Personalizada */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">💌 Mensagem Personalizada</h2>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva uma mensagem especial..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 resize-none h-24"
                />
              </div>

              {/* Botão de Salvar Configurações */}
              <Button
                  type="submit"
                  className="w-full bg-white text-[oklch(0.2_0.08_250)] hover:bg-white/90 font-semibold py-6 text-lg rounded-lg"
                  disabled={isSaving || isUploading}
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : '💾 Salvar Configurações'}
              </Button>
            </form>

            <div className="border-t border-white/20"></div>

            {/* Seção de Músicas */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">🎵 Playlist</h2>
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
              <Label htmlFor="song-upload" className={`
                border-2 border-dashed border-white/30 rounded-lg p-6 text-center
                hover:border-white/50 transition-colors cursor-pointer flex flex-col items-center justify-center
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}>
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav"
                  onChange={handleSongUpload}
                  className="hidden"
                  id="song-upload"
                  disabled={isUploading}
                />
                {isUploading ? <Loader2 className="h-8 w-8 text-white/70 mx-auto mb-2 animate-spin" /> : <Music className="h-8 w-8 text-white/70 mx-auto mb-2" />}
                <p className="text-white font-medium">{isUploading ? 'Enviando...' : 'Clique para adicionar música'}</p>
                <p className="text-white/50 text-sm">(MP3, WAV)</p>
              </Label>

              {songs.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {songs.map((song) => (
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
                        disabled={isSaving || isUploading}
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/20"></div>

            {/* Seção de Fotos */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">📸 Fotos do Carrossel</h2>
              <p className="text-white/70 text-sm">As imagens serão recortadas para a proporção 16:9 (paisagem).</p>
              
              <Label htmlFor="image-upload" className={`
                border-2 border-dashed border-white/30 rounded-lg p-6 text-center 
                hover:border-white/50 transition-colors cursor-pointer flex flex-col items-center justify-center
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}>
                <input
                  type="file"
                  multiple={false} // Apenas uma de cada vez para o editor
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploading}
                />
                {isUploading ? <Loader2 className="h-8 w-8 text-white/70 mx-auto mb-2 animate-spin" /> : <ImageIcon className="h-8 w-8 text-white/70 mx-auto mb-2" />}
                <p className="text-white font-medium">{isUploading ? 'Enviando...' : 'Clique para adicionar foto'}</p>
                <p className="text-white/50 text-sm">(JPG, PNG)</p>
              </Label>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((image) => (
                    <div key={image.id} className="relative group aspect-video">
                      <img
                        src={image.url}
                        alt="Foto"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeleteFile(image.name)}
                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSaving || isUploading}
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

      {/* --- Diálogo do Editor de Imagem --- */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-3xl bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Recortar Imagem (16:9)</DialogTitle>
            <DialogDescription>
              Selecione a área da imagem que você quer mostrar no carrossel.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 p-4">
            {imageSrcToCrop && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={16 / 9} // Força a proporção 16:9
                minWidth={320} // Largura mínima
                minHeight={180} // Altura mínima (16:9)
              >
                <img
                  ref={imgRef}
                  alt="Imagem para recortar"
                  src={imageSrcToCrop}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[60vh] block"
                />
              </ReactCrop>
            )}
            {/* Canvas de preview escondido, usado apenas para gerar o blob */}
            <canvas
              ref={previewCanvasRef}
              style={{
                display: 'none',
                objectFit: 'contain',
              }}
            />
            <Button
              onClick={handleCropAndUpload}
              disabled={isUploading || !completedCrop}
              className="w-full bg-white text-[oklch(0.2_0.08_250)] hover:bg-white/90"
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Recortar e Enviar Imagem
            </Button>
            <Button
              variant="ghost"
              className="w-full text-white/70 hover:bg-white/20 hover:text-white"
              onClick={() => setIsCropDialogOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}