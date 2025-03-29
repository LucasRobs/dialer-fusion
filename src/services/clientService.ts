
import { supabase } from '@/lib/supabase';

export type Client = {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
};

export const clientService = {
  // Buscar todos os clientes do usuário atual
  async getClients() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Client[];
  },

  // Buscar um cliente por ID (apenas se pertencer ao usuário atual)
  async getClientById(id: number) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data as Client;
  },

  // Adicionar um novo cliente
  async addClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...client, user_id: userId }])
      .select();
    
    if (error) throw error;
    return data[0] as Client;
  },

  // Atualizar um cliente existente
  async updateClient(id: number, client: Partial<Client>) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .eq('user_id', userId) // Garantir que o cliente pertence ao usuário atual
      .select();
    
    if (error) throw error;
    return data[0] as Client;
  },

  // Excluir um cliente
  async deleteClient(id: number) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Garantir que o cliente pertence ao usuário atual
    
    if (error) throw error;
    return true;
  },
  
  // Obter estatísticas dos clientes
  async getClientStats() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data: allClients, error: clientsError } = await supabase
      .from('clients')
      .select('id, status')
      .eq('user_id', userId);
    
    if (clientsError) throw clientsError;
    
    const totalClients = allClients?.length || 0;
    const activeClients = allClients?.filter(client => client.status === 'Active')?.length || 0;
    
    return {
      totalClients,
      activeClients
    };
  },

  // Buscar clientes por grupo
  async getClientsByGroupId(groupId: string): Promise<Client[]> {
    try {
      if (!groupId) return [];
      
      console.log('Fetching clients for group ID:', groupId);
      
      // First get client IDs from the group members
      const { data: memberData, error: memberError } = await supabase
        .from('client_group_members')
        .select('client_id')
        .eq('group_id', groupId);
      
      if (memberError) {
        console.error('Error fetching group members:', memberError);
        throw memberError;
      }
      
      if (!memberData || memberData.length === 0) {
        console.log('No members found in group');
        return [];
      }
      
      // Get client IDs - convert string IDs to numbers if needed
      const clientIds = memberData.map(item => {
        // Make sure we're working with numeric IDs
        return typeof item.client_id === 'string' 
          ? parseInt(item.client_id, 10) 
          : item.client_id;
      });
      
      console.log('Found client IDs in group:', clientIds);
      
      // Then fetch the actual clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds);
      
      if (clientsError) {
        console.error('Error fetching clients by IDs:', clientsError);
        throw clientsError;
      }
      
      console.log(`Retrieved ${clients?.length || 0} clients for group`);
      return clients as Client[] || [];
    } catch (error) {
      console.error('Error in getClientsByGroupId:', error);
      return [];
    }
  },

  // Importar clientes de uma planilha
  async importClients(clients: Omit<Client, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Adicionar user_id a cada cliente
    const clientsWithUserId = clients.map(client => ({
      ...client,
      user_id: userId
    }));

    const { data, error } = await supabase
      .from('clients')
      .insert(clientsWithUserId)
      .select();
    
    if (error) throw error;
    return data as Client[];
  }
};
