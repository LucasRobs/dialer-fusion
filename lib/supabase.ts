import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://wwzlfjoiuoocbatfizac.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3emxmam9pdW9vY2JhdGZpemFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNTY5ODEsImV4cCI6MjA1ODkzMjk4MX0.D10AhJ4BeF4vWtH--RYM7WKwePOlZOhEX2tRF0hTfHU"

// Criar cliente para uso no lado do servidor
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

// Criar cliente para uso no lado do cliente
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return supabaseClient
}
