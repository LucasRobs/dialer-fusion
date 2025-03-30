
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
    
    try {
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
      // Ensure clientId is a number
      const numericClientId = typeof clientId === 'string' 
        ? parseInt(clientId, 10) 
        : clientId;
      
      // Check if the client is already in the group to avoid duplicates
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
      
      // Create a new membership
      const { data, error } = await supabase
        .from('client_group_members')
        .insert([{ client_id: numericClientId, group_id: groupId }])
        .select();
        
      if (error) {
        console.error('Error adding client to group:', error);
        throw error;
      }
      
      // Update client count in the group
      await clientGroupService.updateGroupClientCount(groupId);
      
      return data[0];
    } catch (error) {
      console.error('Error in addClientToGroup:', error);
      throw error;
    }
  },
  
  // Remove a client from a group
  removeClientFromGroup: async (clientId: number, groupId: string) => {
    try {
      const numericClientId = typeof clientId === 'string' 
        ? parseInt(clientId, 10) 
        : clientId;
      
      const { error } = await supabase
        .from('client_group_members')
        .delete()
        .eq('client_id', numericClientId)
        .eq('group_id', groupId);
        
      if (error) {
        console.error('Error removing client from group:', error);
        throw error;
      }
      
      // Update client count in the group
      await clientGroupService.updateGroupClientCount(groupId);
      
      return { success: true };
    } catch (error) {
      console.error('Error in removeClientFromGroup:', error);
      throw error;
    }
  },
  
  // Update the client count for a group
  updateGroupClientCount: async (groupId: string) => {
    try {
      // Count clients in the group
      const { count, error: countError } = await supabase
        .from('client_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);
        
      if (countError) {
        console.error('Error counting group members:', countError);
        return;
      }
      
      // Update the group with the new count
      const { error: updateError } = await supabase
        .from('client_groups')
        .update({ client_count: count })
        .eq('id', groupId);
        
      if (updateError) {
        console.error('Error updating group client count:', updateError);
      }
    } catch (error) {
      console.error('Error in updateGroupClientCount:', error);
    }
  },
  
  // Get all clients in a group
  getClientsInGroup: async (groupId: string): Promise<Client[]> => {
    try {
      if (!groupId) return [];
      
      // Get the current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      // Find client IDs in the group
      const { data: memberData, error: memberError } = await supabase
        .from('client_group_members')
        .select('client_id')
        .eq('group_id', groupId);
      
      if (memberError) {
        console.error('Error fetching group members:', memberError);
        throw memberError;
      }
      
      if (!memberData || memberData.length === 0) {
        return [];
      }
      
      // Get client IDs - ensuring they are numbers
      const clientIds = memberData.map(item => {
        return typeof item.client_id === 'string' 
          ? parseInt(item.client_id, 10) 
          : item.client_id;
      });
      
      // Fetch clients by IDs
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
        .eq('user_id', userId); // Ensure we only get clients belonging to the current user
        
      if (clientsError) {
        console.error('Error fetching clients by IDs:', clientsError);
        throw clientsError;
      }
      
      return clients as Client[] || [];
    } catch (error) {
      console.error('Error in getClientsInGroup:', error);
      return [];
    }
  },
  
  // Get all groups a client belongs to
  getClientGroupsByClientId: async (clientId: number): Promise<ClientGroup[]> => {
    try {
      // Ensure clientId is a number
      const numericClientId = typeof clientId === 'string' 
        ? parseInt(clientId, 10) 
        : clientId;
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      // Find group IDs for the client
      const { data: groupMemberships, error: membershipError } = await supabase
        .from('client_group_members')
        .select('group_id')
        .eq('client_id', numericClientId);
        
      if (membershipError) {
        console.error('Error fetching client group memberships:', membershipError);
        throw membershipError;
      }
      
      if (!groupMemberships || groupMemberships.length === 0) {
        return [];
      }
      
      // Extract group IDs
      const groupIds = groupMemberships.map(item => item.group_id);
      
      // Fetch group details
      const { data: groups, error: groupsError } = await supabase
        .from('client_groups')
        .select('*')
        .in('id', groupIds)
        .eq('user_id', userId); // Ensure we only get groups belonging to the current user
        
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
