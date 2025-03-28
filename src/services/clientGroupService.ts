import { supabase } from '@/lib/supabase';
import { Client } from './clientService';

export interface ClientGroup {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  client_count?: number;
}

export interface ClientGroupMember {
  id: string;
  group_id: string;
  client_id: number;
  created_at: string;
}

export const clientGroupService = {
  getClientGroups: async (): Promise<ClientGroup[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('client_groups')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  },

  createClientGroup: async (group: Omit<ClientGroup, 'id' | 'created_at'>) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    const { data, error } = await supabase
      .from('client_groups')
      .insert([{ ...group, user_id: userId }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  updateClientGroup: async (id: string, updates: Partial<ClientGroup>) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    const { data, error } = await supabase
      .from('client_groups')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  deleteClientGroup: async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    await supabase.from('client_group_members').delete().eq('group_id', id);
    
    const { error } = await supabase
      .from('client_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    return { success: true };
  },

  addClientToGroup: async (clientId: number, groupId: string) => {
    const { data, error } = await supabase
      .from('client_group_members')
      .insert([{ client_id: clientId, group_id: groupId }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  removeClientFromGroup: async (clientId: number, groupId: string) => {
    const { error } = await supabase
      .from('client_group_members')
      .delete()
      .eq('client_id', clientId)
      .eq('group_id', groupId);
    
    if (error) throw error;
    return { success: true };
  },

  getClientsInGroup: async (groupId: string): Promise<Client[]> => {
    const { data, error } = await supabase
        .from("client_group_members")
        .select(`
            client_id,
            clients (*)
        `)
        .eq("group_id", groupId.toString()); // 🔹 Certifique-se de que é string

    if (error) {
        console.error("Error fetching clients in group:", error);
        throw error;
    }

    return data.map(item => item.clients ? item.clients : null).filter(Boolean) as Client[];
};

  getClientGroupsByClientId: async (clientId: number): Promise<ClientGroup[]> => {
    const { data, error } = await supabase
      .from('client_group_members')
      .select('group_id')
      .eq('client_id', clientId);
    
    if (error) throw error;
    if (!data.length) return [];
    
    const groupIds = data.map(({ group_id }) => group_id);
    const { data: groups, error: groupError } = await supabase
      .from('client_groups')
      .select('*')
      .in('id', groupIds);
    
    if (groupError) throw groupError;
    return groups || [];
  }
};
