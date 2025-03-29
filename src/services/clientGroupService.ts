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
      console.log(`Adding client ${clientId} to group ${groupId}`);
      
      // Ensure clientId is a number
      const numericClientId = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
      
      // First check if the client is already in the group
      const { data: existingMembership, error: checkError } = await supabase
        .from('client_group_members')
        .select('*')
        .eq('client_id', numericClientId)
        .eq('group_id', groupId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking membership:', checkError);
        throw checkError;
      }
      
      // If already exists, return the existing record
      if (existingMembership) {
        console.log('Client already in group, returning existing membership');
        return existingMembership;
      }
      
      // Otherwise create a new membership
      console.log(`Creating new membership record for client ${numericClientId} in group ${groupId}`);
      const { data, error } = await supabase
        .from('client_group_members')
        .insert([{ client_id: numericClientId, group_id: groupId }])
        .select();
        
      if (error) {
        console.error('Error adding client to group:', error);
        throw error;
      }
      
      console.log('Successfully added client to group');
      return data[0];
    } catch (error) {
      console.error('Error in addClientToGroup:', error);
      throw error;
    }
  },
  
  // Remove a client from a group
  removeClientFromGroup: async (clientId: number, groupId: string) => {
    const numericClientId = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
    
    console.log(`Removing client ${numericClientId} from group ${groupId}`);
    
    const { error } = await supabase
      .from('client_group_members')
      .delete()
      .eq('client_id', numericClientId)
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error removing client from group:', error);
      throw error;
    }
    
    console.log('Successfully removed client from group');
    return { success: true };
  },
  
  // Get all clients in a group
  getClientsInGroup: async (groupId: string): Promise<Client[]> => {
    try {
      if (!groupId) return [];
      
      console.log(`Getting clients in group: ${groupId}`);
      
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
        console.log('No clients found in group');
        return [];
      }
      
      // Get client IDs - ensuring they are numbers
      const clientIds = data.map(item => {
        return typeof item.client_id === 'string' 
          ? parseInt(item.client_id, 10) 
          : item.client_id;
      });
      
      console.log(`Found ${clientIds.length} client IDs in group: ${clientIds.join(', ')}`);
      
      // Fetch clients by IDs
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
      console.error('Error in getClientsInGroup:', error);
      return [];
    }
  },
  
  // Get all groups a client belongs to
  getClientGroupsByClientId: async (clientId: number): Promise<ClientGroup[]> => {
    try {
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
      
      return groups as ClientGroup[] || [];
    } catch (error) {
      console.error('Error in getClientGroupsByClientId:', error);
      return [];
    }
  }
};
