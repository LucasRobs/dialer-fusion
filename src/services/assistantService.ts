
import { supabase } from '@/lib/supabase';

export interface Assistant {
  id: string;
  name: string;
  assistant_id: string;
  system_prompt?: string;
  first_message?: string;
  created_at?: string;
  user_id?: string;
  status?: 'pending' | 'ready' | 'failed';
}

const assistantService = {
  async getAllAssistants(userId?: string): Promise<Assistant[]> {
    try {
      let query = supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by user_id if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching assistants:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllAssistants:', error);
      return [];
    }
  },
  
  async saveAssistant(assistant: Omit<Assistant, 'id' | 'created_at'>): Promise<Assistant | null> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .insert(assistant)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving assistant:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in saveAssistant:', error);
      return null;
    }
  },

  async updateAssistant(assistantId: string, updates: Partial<Assistant>): Promise<Assistant | null> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .update(updates)
        .eq('id', assistantId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating assistant:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateAssistant:', error);
      return null;
    }
  },
  
  async selectAssistant(assistantId: string): Promise<Assistant | null> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('assistant_id', assistantId)
        .single();
      
      if (error) {
        console.error('Error selecting assistant:', error);
        return null;
      }
      
      // Save to localStorage for compatibility with existing code
      localStorage.setItem('selected_assistant', JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.error('Error in selectAssistant:', error);
      return null;
    }
  },
  
  async getAssistantById(assistantId: string): Promise<Assistant | null> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('assistant_id', assistantId)
        .single();
      
      if (error) {
        console.error('Error getting assistant by ID:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getAssistantById:', error);
      return null;
    }
  }
};

export default assistantService;
