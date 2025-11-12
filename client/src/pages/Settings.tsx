import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Calendar as CalendarIcon, Upload, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase, BUCKET_NAME } from "@/supabase";
import { config } from "@/config";

// Interface para garantir a tipagem dos dados
interface StoredSettings {
  id: number;
  startDate: Date; 
  customMessage: string;
  images: string[];
  songs: { title: string; artist: string; file: string }[];
}

const SETTINGS_ID = 1; // ID fixo da linha

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para Gestão de Mídia
  const [mediaFiles, setMediaFiles] = useState<
    Array<{ name: string; url: string; isImage: boolean }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);

  // --- 1. Carregar Configurações Atuais (Data, Mensagem e Mídia) ---
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      
      let loadedSettings: Partial<StoredSettings> = {};

      // 1.1. Carregar do Banco de Dados
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('start_date, custom_message')
          .eq('id', SETTINGS_ID)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = Não encontrou a linha
        
        if (data) {
          setDate(new Date(data.start_date));
          setMessage(data.custom_message || "");
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast.error("Erro ao carregar configurações. Verifique o RLS da tabela 'settings'.");
      }

      // 1.2. Carregar do Storage
      try {
        const { data: files, error } = await supabase
          .storage
          .from(BUCKET_NAME)
          .list();
          
        if (error) throw error;
        
        const { data: { publicUrl: BUCKET_URL } } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
        
        const fileList = files.map(file => {
            const publicUrl = `${BUCKET_URL}/${encodeURIComponent(file.name)}`;
            const isImage = file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg');
            return { name: file.name, url: publicUrl, isImage };
        }).filter(file => file.name !== '.emptyFolderPlaceholder'); // Ignora ficheiro placeholder
        
        setMediaFiles(fileList);

      } catch (error) {
        console.error("Erro ao carregar mídia:", error);
        toast.error("Erro ao carregar mídia. Verifique o RLS do Storage 'media'.");
      }
      
      setLoading(false);
    }

    loadSettings();
  }, []); // Executa apenas no mount


  // --- 2. Lógica de Salvar Configurações (Data e Mensagem) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); // PREVINE O RECARREGAMENTO DA PÁGINA
    if (!date || isSaving) return;

    setIsSaving(true);
    
    try {
      // O upsert tentará atualizar (se o ID existir) ou inserir (se o ID não existir)
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          id: SETTINGS_ID, 
          start_date: format(date, "yyyy-MM-dd'T'HH:mm:ss"), // Formato ISO para o banco de dados
          custom_message: message 
        }, { onConflict: 'id' }); 

      if (error) throw error;
      
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar as configurações. Verifique o RLS e a conexão.");
    } finally {
      setIsSaving(false);
    }
  };


  // --- 3. Lógica de Upload de Ficheiros (Música e Foto) ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of Array.from(files)) {
        const filePath = file.name;
        
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false // upsert false para evitar sobrescrever acidentalmente.
          });
          
        if (uploadError) {
          if (uploadError.message.includes('already exists')) {
            toast.warning(`O ficheiro "${file.name}" já existe. Não foi substituído.`);
          } else {
            throw uploadError; // Lança outros erros
          }
        } else {
          successCount++;
        }
      }
      
      // Recarregar a lista de mídia após o upload
      if (successCount > 0) {
          const { data: filesList } = await supabase.storage.from(BUCKET_NAME).list();
          if (filesList) {
             // Lógica de mapeamento igual ao useEffect para atualizar o estado
            const { data: { publicUrl: BUCKET_URL } } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
            
            const fileList = filesList.map(file => {
                const publicUrl = `${BUCKET_URL}/${encodeURIComponent(file.name)}`;
                const isImage = file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.jpeg');
                return { name: file.name, url: publicUrl, isImage };
            }).filter(file => file.name !== '.emptyFolderPlaceholder');
            setMediaFiles(fileList);
            
            toast.success(`Upload de ${successCount} ficheiro(s) concluído.`);
          }
      }
      
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error(`Falha no upload. Verifique o RLS de INSERT/UPDATE do Storage. Erro: ${errorCount > 0 ? 'Múltiplos ficheiros falharam.' : (error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  
  // --- 4. Lógica de Remover Ficheiros ---
  const handleDeleteFile = async (fileName: string) => {
    if (!window.confirm(`Tem a certeza que quer remover o ficheiro "${fileName}"?`)) return;

    setIsSaving(true); // Reutilizar o estado para indicar operação em andamento
    
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName]);

      if (error) throw error;
      
      // Atualizar lista localmente
      setMediaFiles(prev => prev.filter(f => f.name !== fileName));
      toast.success(`Ficheiro "${fileName}" removido.`);

    } catch (error) {
      console.error("Erro ao remover ficheiro:", error);
      toast.error("Erro ao remover ficheiro. Verifique o RLS de DELETE do Storage.");
    } finally {
      setIsSaving(false);
    }
  };

  const images = mediaFiles.filter(f => f.isImage);
  const songs = mediaFiles.filter(f => !f.isImage);


  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-gray-600 hover:text-gray-800 p-0"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">
            Configurações
          </h1>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-6 w-6 text-gray-500 animate-spin mr-2" /> 
            A carregar dados...
          </div>
        )}

        {/* Formulário de Data e Mensagem */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Configurações Principais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Data do Evento */}
              <div className="space-y-2">
                <Label htmlFor="date">Data do Evento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${
                        !date && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "PPP", { locale: ptBR })
                      ) : (
                        <span>Escolha uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Mensagem Personalizada */}
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem Personalizada</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: 'Mal posso esperar por este dia!'"
                  className="min-h-[100px]"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving || !date}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Salvar Configurações"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Gestão de Mídia */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Gestão de Fotos e Músicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Secção de Upload */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">
                Adicionar Mídia (Imagens ou MP3)
              </Label>
              <div className="flex items-center space-x-2">
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*,.mp3,.wav"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "A enviar..." : "Escolher Ficheiros"}
                </Button>
                <p className="text-sm text-gray-500">
                  Tipos aceites: JPG, PNG, MP3.
                </p>
              </div>
            </div>

            {/* Lista de Fotos */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">
                Fotos ({images.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((file, index) => (
                  <div key={index} className="relative group aspect-[4/3] rounded-lg overflow-hidden shadow-md">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteFile(file.name)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de Músicas */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2">
                Músicas ({songs.length})
              </h3>
              <ul className="space-y-2">
                {songs.map((file, index) => (
                  <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                    <span className="text-sm truncate mr-4">
                      {file.name}
                    </span>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="flex-shrink-0 h-8 w-8"
                      onClick={() => handleDeleteFile(file.name)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}