import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL ou chave anônima não encontrada no ambiente.")
  throw new Error("Configuração do Supabase incompleta. Verifique as variáveis de ambiente.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Função auxiliar para verificar a conexão com o Supabase
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from("assistants").select("count", { count: "exact" }).limit(1)

    if (error) {
      console.error("Erro ao conectar com o Supabase:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Exceção ao verificar conexão com Supabase:", err)
    return false
  }
}
