
// Arquivo de configuração para conexão com Supabase
// Quando você conectar sua conta Supabase ao projeto Lovable,
// você poderá usar a integração nativa do Lovable com Supabase

import { createClient } from '@supabase/supabase-js';

// Estes valores serão preenchidos quando você conectar o Supabase
// através da integração nativa do Lovable
const supabaseUrl = '';
const supabaseAnonKey = '';

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
