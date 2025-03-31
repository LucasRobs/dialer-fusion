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
      throw error;
    }
  },

  createClientGroup: async (group: Omit<ClientGroup, 'id' | 'created_at'>) => {
    try {
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
    } catch (error) {
      console.error('Error in createClientGroup:', error);
      throw error;
    }
  },

  updateClientGroup: async (id: string, updates: Partial<ClientGroup>) => {
    try {
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
    } catch (error) {
      console.error('Error in updateClientGroup:', error);
      throw error;
    }
  },

  deleteClientGroup: async (id: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      // First delete all members of this group
      const { error: membersError } = await supabase
        .from('client_group_members')
        .delete()
        .eq('group_id', id);
      
      if (membersError) {
        console.error('Error deleting group members:', membersError);
        throw membersError;
      }
      
      // Then delete the group itself
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

  addClientToGroup: async (clientId: number, groupId: string) => {
    try {
      // Check if the client is already in the group
      const { data: existingMember, error: checkError } = await supabase
        .from('client_group_members')
        .select('*')
        .eq('client_id', clientId)
        .eq('group_id', groupId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking if client is in group:', checkError);
        throw checkError;
      }
      
      // If client is already in the group, just return that record
      if (existingMember) {
        return existingMember;
      }
      
      // Otherwise, add the client to the group
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

  removeClientFromGroup: async (clientId: number, groupId: string) => {
    try {
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

  getClientsInGroup: async (groupId: string): Promise<Client[]> => {
    try {
      const { data, error } = await supabase
        .from('client_group_members')
        .select('client_id')
        .eq('group_id', groupId);
      
      if (error) {
        console.error('Error getting clients in group:', error);
        throw error;
      }
      
      if (!data.length) return [];
      
      // Get client IDs from the membership data
      const clientIds = data.map(({ client_id }) => client_id);
      
      // Fetch the actual client records
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds);
      
      if (clientError) {
        console.error('Error fetching clients by IDs:', clientError);
        throw clientError;
      }
      
      return clients || [];
    } catch (error) {
      console.error('Error in getClientsInGroup:', error);
      throw error;
    }
  },

  getClientGroupsByClientId: async (clientId: number): Promise<ClientGroup[]> => {
    try {
      const { data, error } = await supabase
        .from('client_group_members')
        .select('group_id')
        .eq('client_id', clientId);
      
      if (error) {
        console.error('Error getting groups for client:', error);
        throw error;
      }
      
      if (!data.length) return [];
      
      // Get group IDs from the membership data
      const groupIds = data.map(({ group_id }) => group_id);
      
      // Fetch the actual group records
      const { data: groups, error: groupError } = await supabase
        .from('client_groups')
        .select('*')
        .in('id', groupIds);
      
      if (groupError) {
        console.error('Error fetching groups by IDs:', groupError);
        throw groupError;
      }
      
      return groups || [];
    } catch (error) {
      console.error('Error in getClientGroupsByClientId:', error);
      throw error;
    }
  }
};
