import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Sem Supabase configurado o app funciona em "modo local": sem login, com
// favoritos, destaques e notas salvos só neste navegador (userDataStore).
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Em dev isso aparece no console; em produção a Vercel precisa ter as duas
  // variáveis configuradas em Project Settings > Environment Variables.
  console.warn(
    "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local"
  );
}

// createClient lança exceção se receber uma URL vazia/inválida, o que
// quebraria o build (pré-renderização estática) quando as variáveis de
// ambiente não estiverem configuradas. Usamos um placeholder sintaticamente
// válido nesse caso: o build passa, e chamadas reais só falham em runtime
// (com erro de rede claro), nunca no build.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

