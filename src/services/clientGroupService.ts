
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
  // Get all client groups for a user
  getClientGroups: async (): Promise<ClientGroup[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('client_groups')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching client groups:', error);
      throw error;
    }
    
    return data || [];
  },
  
  // Create a new client group
  createClientGroup: async (group: Omit<ClientGroup, 'id' | 'created_at'>) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    const { data, error } = await supabase
      .from('client_groups')
      .insert([{ ...group, user_id: userId }])
      .select();
      
    if (error) {
      console.error('Error creating client group:', error);
      throw error;
    }
    
    return data[0];
  },
  
  // Update a client group
  updateClientGroup: async (id: string, updates: Partial<ClientGroup>) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    const { data, error } = await supabase
      .from('client_groups')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select();
      
    if (error) {
      console.error('Error updating client group:', error);
      throw error;
    }
    
    return data[0];
  },
  
  // Delete a client group
  deleteClientGroup: async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    // First delete all client-group relationships
    const { error: relationshipError } = await supabase
      .from('client_group_members')
      .delete()
      .eq('group_id', id);
      
    if (relationshipError) {
      console.error('Error deleting client group memberships:', relationshipError);
      throw relationshipError;
    }
    
    // Then delete the group
    const { error } = await supabase
      .from('client_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error deleting client group:', error);
      throw error;
    }
    
    return { success: true };
  },
  
  // Add a client to a group
  addClientToGroup: async (clientId: number, groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_group_members')
        .insert([{ client_id: clientId, group_id: groupId }])
        .select();
        
      if (error) {
        console.error('Error adding client to group:', error);
        throw error;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in addClientToGroup:', error);
      throw error;
    }
  },
  
  // Remove a client from a group
  removeClientFromGroup: async (clientId: number, groupId: string) => {
    const { error } = await supabase
      .from('client_group_members')
      .delete()
      .eq('client_id', clientId)
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error removing client from group:', error);
      throw error;
    }
    
    return { success: true };
  },
  
  // Get all clients in a group
  getClientsInGroup: async (groupId: string): Promise<Client[]> => {
    try {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('client_group_members')
        .select(`
          client_id,
          clients (*)
        `)
        .eq('group_id', groupId);
      
      if (error) {
        console.error('Error fetching clients in group:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Extract the clients from the nested data
      const clients = data
        .filter(item => item.clients)
        .map(item => item.clients as Client);
      
      return clients;
    } catch (error) {
      console.error('Error in getClientsInGroup:', error);
      return [];
    }
  },
  
  // Get all groups a client belongs to
  getClientGroupsByClientId: async (clientId: number): Promise<ClientGroup[]> => {
    try {
      const { data, error } = await supabase
        .from('client_group_members')
        .select(`
          group_id,
          client_groups (*)
        `)
        .eq('client_id', clientId);
        
      if (error) {
        console.error('Error fetching client groups for client:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Extract the groups from the nested data
      const groups = data
        .filter(item => item.client_groups)
        .map(item => item.client_groups as ClientGroup);
      
      return groups;
    } catch (error) {
      console.error('Error in getClientGroupsByClientId:', error);
      return [];
    }
  }
};
