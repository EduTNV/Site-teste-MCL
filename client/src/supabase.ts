import { createClient } from "@supabase/supabase-js";

// Variáveis de ambiente
// IMPORTANTE: No Render ou no seu ficheiro .env, as variáveis DEVEM começar com VITE_
// para que o Vite as injete no código do cliente.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Nome do Bucket (Balde) do Supabase Storage.
// Este nome deve corresponder ao que você criou na aba Storage do Supabase.
export const BUCKET_NAME = "media"; 

// 1. Verificação de Segurança/Erro
// Garante que as chaves existem antes de tentar criar o cliente.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Isto irá parar a aplicação se as chaves não forem carregadas corretamente.
  throw new Error(
    "As chaves do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão definidas. Verifique as variáveis de ambiente do Render e o seu .env."
  );
}

// 2. Criação do Cliente Supabase
// Usa as chaves injetadas pelo ambiente.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);