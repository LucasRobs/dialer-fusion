
import { supabase } from '@/lib/supabase';

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
  getClientGroups: async (userId: string): Promise<ClientGroup[]> => {
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
    const { data, error } = await supabase
      .from('client_groups')
      .insert([group])
      .select();
      
    if (error) {
      console.error('Error creating client group:', error);
      throw error;
    }
    
    return data[0];
  },
  
  // Update a client group
  updateClientGroup: async (id: string, updates: Partial<ClientGroup>) => {
    const { data, error } = await supabase
      .from('client_groups')
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('Error updating client group:', error);
      throw error;
    }
    
    return data[0];
  },
  
  // Delete a client group
  deleteClientGroup: async (id: string) => {
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
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting client group:', error);
      throw error;
    }
    
    return { success: true };
  },
  
  // Add a client to a group
  addClientToGroup: async (clientId: number, groupId: string) => {
    const { data, error } = await supabase
      .from('client_group_members')
      .insert([{ client_id: clientId, group_id: groupId }])
      .select();
      
    if (error) {
      console.error('Error adding client to group:', error);
      throw error;
    }
    
    return data[0];
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
  getClientsInGroup: async (groupId: string) => {
    const { data, error } = await supabase
      .from('client_group_members')
      .select(`
        clients (*)
      `)
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error fetching clients in group:', error);
      throw error;
    }
    
    return data.map(item => item.clients);
  },
  
  // Get all groups a client belongs to
  getClientGroups: async (clientId: number): Promise<ClientGroup[]> => {
    const { data, error } = await supabase
      .from('client_group_members')
      .select(`
        client_groups (*)
      `)
      .eq('client_id', clientId);
      
    if (error) {
      console.error('Error fetching client groups for client:', error);
      throw error;
    }
    
    return data.map(item => item.client_groups);
  }
};
