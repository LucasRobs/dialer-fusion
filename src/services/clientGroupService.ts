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
    try {
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
    } catch (error) {
      console.error('Error in getClientGroups:', error);
      return [];
    }
  },
  
  // Create a new client group
  createClientGroup: async (group: Omit<ClientGroup, 'id' | 'created_at'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('client_groups')
        .insert([{ ...group, user_id: userId }])
        .select();
        
      if (error) {
        console.error('Error creating client group:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in createClientGroup:', error);
      throw error;
    }
  },
  
  // Update a client group
  updateClientGroup: async (id: string, updates: Partial<ClientGroup>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
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
      
      if (!data || data.length === 0) {
        throw new Error('Client group not found or not updated');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in updateClientGroup:', error);
      throw error;
    }
  },
  
  // Delete a client group
  deleteClientGroup: async (id: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Start a transaction using a single RPC call for both operations if possible
      // If your Supabase setup doesn't support transactions, keep these as separate calls
      
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
    } catch (error) {
      console.error('Error in deleteClientGroup:', error);
      throw error;
    }
  },
  
  // Add a client to a group
  addClientToGroup: async (clientId: number, groupId: string) => {
    try {
      if (!clientId || !groupId) {
        throw new Error('Client ID and Group ID are required');
      }
      
      // First check if the client is already in the group
      const { data: existingMembership, error: checkError } = await supabase
        .from('client_group_members')
        .select('*')
        .eq('client_id', clientId)
        .eq('group_id', groupId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking membership:', checkError);
        throw checkError;
      }
      
      // If already exists, return the existing record
      if (existingMembership) {
        return existingMembership;
      }
      
      // Otherwise create a new membership
      const { data, error } = await supabase
        .from('client_group_members')
        .insert([{ client_id: clientId, group_id: groupId }])
        .select();
        
      if (error) {
        console.error('Error adding client to group:', error);
        throw error;
      }
      
      // Make sure data exists and has at least one element before returning
      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in addClientToGroup:', error);
      // Re-throw the error so it can be caught by UI components
      throw error;
    }
  },
  
  // Remove a client from a group
  removeClientFromGroup: async (clientId: number, groupId: string) => {
    try {
      if (!clientId || !groupId) {
        throw new Error('Client ID and Group ID are required');
      }
      
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
    } catch (error) {
      console.error('Error in removeClientFromGroup:', error);
      throw error;
    }
  },
  
  // Get all clients in a group
  getClientsInGroup: async (groupId: string): Promise<Client[]> => {
    try {
      if (!groupId) return [];
      
      // Direct join query approach
      const { data, error } = await supabase
        .from('client_group_members')
        .select('client_id')
        .eq('group_id', groupId);
      
      if (error) {
        console.error('Error fetching clients in group:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Get client IDs
      const clientIds = data.map(item => item.client_id);
      
      // Fetch clients by IDs
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds);
        
      if (clientsError) {
        console.error('Error fetching clients by IDs:', clientsError);
        throw clientsError;
      }
      
      return clients || [];
    } catch (error) {
      console.error('Error in getClientsInGroup:', error);
      return [];
    }
  },
  
  // Get all groups a client belongs to
  getClientGroupsByClientId: async (clientId: number): Promise<ClientGroup[]> => {
    try {
      if (!clientId) return [];
      
      // Direct join query approach
      const { data, error } = await supabase
        .from('client_group_members')
        .select('group_id')
        .eq('client_id', clientId);
        
      if (error) {
        console.error('Error fetching client groups for client:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Get group IDs
      const groupIds = data.map(item => item.group_id);
      
      // Fetch groups by IDs
      const { data: groups, error: groupsError } = await supabase
        .from('client_groups')
        .select('*')
        .in('id', groupIds);
        
      if (groupsError) {
        console.error('Error fetching groups by IDs:', groupsError);
        throw groupsError;
      }
      
      return groups || [];
    } catch (error) {
      console.error('Error in getClientGroupsByClientId:', error);
      return [];
    }
  }
};