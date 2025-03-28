
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Assistant {
  id: string;
  name: string;
  assistant_id: string;
  system_prompt?: string;
  first_message?: string;
  created_at?: string;
  user_id?: string;
}

const assistantService = {
  async getAllAssistants(): Promise<Assistant[]> {
    try {
      console.log('Fetching all assistants...');
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching assistants:', error);
        return [];
      }
      
      console.log('Successfully fetched assistants:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Exception in getAllAssistants:', error);
      return [];
    }
  },
  
  async saveAssistant(assistant: Omit<Assistant, 'id' | 'created_at'>): Promise<Assistant | null> {
    try {
      console.log('Saving assistant:', assistant.name);
      
      if (!assistant.user_id) {
        console.error('Error saving assistant: user_id is required');
        return null;
      }
      
      const { data, error } = await supabase
        .from('assistants')
        .insert(assistant)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving assistant to Supabase:', error);
        return null;
      }
      
      console.log('Successfully saved assistant:', data.name, 'with ID:', data.id);
      return data;
    } catch (error) {
      console.error('Exception in saveAssistant:', error);
      return null;
    }
  },
  
  async selectAssistant(assistantId: string): Promise<Assistant | null> {
    try {
      console.log('Selecting assistant by ID:', assistantId);
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('assistant_id', assistantId)
        .maybeSingle();
      
      if (error) {
        console.error('Error selecting assistant:', error);
        return null;
      }
      
      if (!data) {
        console.log('No assistant found with ID:', assistantId);
        return null;
      }
      
      // Save to localStorage for compatibility with existing code
      localStorage.setItem('selected_assistant', JSON.stringify(data));
      console.log('Selected assistant stored in localStorage');
      
      return data;
    } catch (error) {
      console.error('Exception in selectAssistant:', error);
      return null;
    }
  },
  
  async getAssistantById(assistantId: string): Promise<Assistant | null> {
    try {
      console.log('Getting assistant by ID:', assistantId);
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('assistant_id', assistantId)
        .maybeSingle();
      
      if (error) {
        console.error('Error getting assistant by ID:', error);
        return null;
      }
      
      if (!data) {
        console.log('No assistant found with ID:', assistantId);
        return null;
      }
      
      console.log('Assistant found:', data.name);
      return data;
    } catch (error) {
      console.error('Exception in getAssistantById:', error);
      return null;
    }
  },
  
  async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log('Deleting assistant with ID:', assistantId);
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('assistant_id', assistantId);
      
      if (error) {
        console.error('Error deleting assistant:', error);
        return false;
      }
      
      console.log('Successfully deleted assistant');
      return true;
    } catch (error) {
      console.error('Exception in deleteAssistant:', error);
      return false;
    }
  }
};

export default assistantService;
