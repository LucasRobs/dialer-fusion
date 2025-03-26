
import { supabase } from '@/lib/supabase';

export type Client = {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at?: string;
};

export const clientService = {
  // Buscar todos os clientes
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Client[];
  },

  // Buscar um cliente por ID
  async getClientById(id: number) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Adicionar um novo cliente
  async addClient(client: Omit<Client, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select();
    
    if (error) throw error;
    return data[0] as Client;
  },

  // Atualizar um cliente existente
  async updateClient(id: number, client: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as Client;
  },

  // Excluir um cliente
  async deleteClient(id: number) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
