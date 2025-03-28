
import { supabase } from '@/lib/supabase';

// Interface for the Assistant data
export interface Assistant {
  id?: number;
  name: string;
  assistant_id: string;
  system_prompt?: string;
  first_message?: string;
  user_id?: string;
  created_at?: string;
  status?: string;
}

// Service for managing AI assistants
const assistantService = {
  // Get all assistants
  async getAllAssistants(): Promise<Assistant[]> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching assistants:', error);
      return [];
    }
  },
  
  // Get user's assistants
  async getUserAssistants(userId: string): Promise<Assistant[]> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user assistants:', error);
      return [];
    }
  },
  
  // Save a new assistant
  async saveAssistant(assistant: Omit<Assistant, 'id'>): Promise<Assistant | null> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .insert([assistant])
        .select();
      
      if (error) {
        throw error;
      }
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error saving assistant:', error);
      return null;
    }
  },
  
  // Get assistant by ID
  async getAssistantById(assistantId: string): Promise<Assistant | null> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('assistant_id', assistantId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching assistant by id:', error);
      return null;
    }
  },
  
  // Get assistant by name
  async getAssistantByName(name: string): Promise<Assistant | null> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('name', name)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching assistant by name:', error);
      return null;
    }
  },
  
  // Select an assistant (in this implementation, we'll just return the assistant)
  async selectAssistant(assistantId: string): Promise<Assistant | null> {
    try {
      return await this.getAssistantById(assistantId);
    } catch (error) {
      console.error('Error selecting assistant:', error);
      return null;
    }
  }
};

export default assistantService;
