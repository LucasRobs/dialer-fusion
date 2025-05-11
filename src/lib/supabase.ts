import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wwzlfjoiuoocbatfizac.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3emxmam9pdW9vY2JhdGZpemFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNTY5ODEsImV4cCI6MjA1ODkzMjk4MX0.D10AhJ4BeF4vWtH--RYM7WKwePOlZOhEX2tRF0hTfHU";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL e Anon Key são necessários');
}

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

// Configurações para vozes do 11Labs
export const VOICE_SETTINGS = {
  PTBR_FEMALE: {
    name: "Voz Feminina (PT-BR)",
    id: "33B4UnXyTNbgLmdEDh5P"
  },
}

export interface UserPayment {
  id: string;
  user_id: string;
  payment_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  subscription_type?: 'recurring' | 'one_time';
  next_payment_date?: string;
}