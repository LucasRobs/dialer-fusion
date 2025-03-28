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
  // Get all client groups for the logged-in user
  getClientGroups: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('client_groups')
      .select('*')
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error fetching client groups:', error);
      throw error;
    }
    
    return data || [];
  },
  
  // Create a new client group for the logged-in user
  createClientGroup: async (group: Omit<ClientGroup, 'id' | 'created_at' | 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('client_groups')
      .insert([{ 
        ...group, 
        user_id: user.id 
      }])
      .select();
      
    if (error) {
      console.error('Error creating client group:', error);
      throw error;
    }
    
    return data[0];
  },
  
  // Update a client group (ensuring it belongs to the logged-in user)
  updateClientGroup: async (id: string, updates: Partial<ClientGroup>) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('client_groups')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own groups
      .select();
      
    if (error) {
      console.error('Error updating client group:', error);
      throw error;
    }
    
    return data[0];
  },
  
  // Delete a client group (ensuring it belongs to the logged-in user)
  deleteClientGroup: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    // First delete all client-group relationships
    const { error: relationshipError } = await supabase
      .from('client_group_members')
      .delete()
      .eq('group_id', id);
      
    if (relationshipError) {
      console.error('Error deleting client group memberships:', relationshipError);
      throw relationshipError;
    }
    
    // Then delete the group (ensuring it belongs to the user)
    const { error } = await supabase
      .from('client_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error deleting client group:', error);
      throw error;
    }
    
    return { success: true };
  },
  
  // Add a client to a group (ensuring the group belongs to the logged-in user)
  addClientToGroup: async (clientId: number, groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    // First, verify that the group belongs to the user
    const { data: groupData, error: groupError } = await supabase
      .from('client_groups')
      .select('id')
      .eq('id', groupId)
      .eq('user_id', user.id)
      .single();

    if (groupError || !groupData) {
      console.error('Group not found or not owned by user');
      throw new Error('Grupo não encontrado ou não pertence ao usuário');
    }

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
  
  // Remove a client from a group (ensuring the group belongs to the logged-in user)
  removeClientFromGroup: async (clientId: number, groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    // First, verify that the group belongs to the user
    const { data: groupData, error: groupError } = await supabase
      .from('client_groups')
      .select('id')
      .eq('id', groupId)
      .eq('user_id', user.id)
      .single();

    if (groupError || !groupData) {
      console.error('Group not found or not owned by user');
      throw new Error('Grupo não encontrado ou não pertence ao usuário');
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
  },
  
  // Get all clients in a group (ensuring the group belongs to the logged-in user)
  getClientsInGroup: async (groupId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    // First, verify that the group belongs to the user
    const { data: groupData, error: groupError } = await supabase
      .from('client_groups')
      .select('id')
      .eq('id', groupId)
      .eq('user_id', user.id)
      .single();

    if (groupError || !groupData) {
      console.error('Group not found or not owned by user');
      throw new Error('Grupo não encontrado ou não pertence ao usuário');
    }

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
  
  // Get all groups a client belongs to (filtered by logged-in user)
  getClientGroupsByClientId: async (clientId: number): Promise<ClientGroup[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('client_group_members')
      .select(`
        client_groups (*)
      `)
      .eq('client_id', clientId)
      .eq('client_groups.user_id', user.id); // Ensure groups belong to the user
      
    if (error) {
      console.error('Error fetching client groups for client:', error);
      throw error;
    }
    
    return data.map(item => item.client_groups);
  }
};