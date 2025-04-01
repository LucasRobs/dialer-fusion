
// Arquivo de configuração para conexão com Supabase

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pblgifjpehuauriqnjbn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBibGdpZmpwZWh1YXVyaXFuamJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1Mjk2ODAsImV4cCI6MjA1OTEwNTY4MH0.NPzH-55PWMkinaVtkBiD7AcUGp6itJFK2w3LAKcybzQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para obter um cliente autenticado (após login)
export const getSupabaseClient = (accessToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
