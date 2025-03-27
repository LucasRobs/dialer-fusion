
// Arquivo de configuração para conexão com Supabase

import { createClient } from '@supabase/supabase-js';

// Valores de conexão para o Supabase
const supabaseUrl = 'https://ovanntvqwzifxjrnnalr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8';

// Este cliente será usado para operações que não precisam de autenticação
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
