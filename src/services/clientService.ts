import { supabase } from '@/lib/supabase';

export type Client = {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  user_id: string; // Adicionando user_id como campo obrigatório
  created_at?: string;
  updated_at?: string;
};

export const clientService = {
  // Buscar clientes do usuário logado
  async getClients() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id) // Filtrar apenas clientes do usuário logado
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Client[];
  },

  // Buscar um cliente por ID para o usuário logado
  async getClientById(id: number) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Garantir que o cliente pertence ao usuário logado
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Adicionar um novo cliente para o usuário logado
  async addClient(client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('clients')
      .insert([{ 
        ...client, 
        user_id: user.id // Adicionar o ID do usuário logado
      }])
      .select();
    
    if (error) throw error;
    return data[0] as Client;
  },

  // Atualizar um cliente existente do usuário logado
  async updateClient(id: number, client: Partial<Client>) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .eq('user_id', user.id) // Garantir que só atualiza clientes do usuário
      .select();
    
    if (error) throw error;
    return data[0] as Client;
  },

  // Excluir um cliente do usuário logado
  async deleteClient(id: number) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Garantir que só exclui clientes do usuário
    
    if (error) throw error;
    return true;
  },
  
  // Obter estatísticas dos clientes do usuário logado
  async getClientStats() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data: allClients, error: clientsError } = await supabase
      .from('clients')
      .select('id, status')
      .eq('user_id', user.id); // Estatísticas apenas para o usuário logado
    
    if (clientsError) throw clientsError;
    
    const totalClients = allClients?.length || 0;
    const activeClients = allClients?.filter(client => client.status === 'Active')?.length || 0;
    
    return {
      totalClients,
      activeClients
    };
  }
};