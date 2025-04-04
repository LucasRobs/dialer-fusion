import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Assistant {
  id: string;
  name: string;
  assistant_id: string;
  user_id: string;
  status: 'draft' | 'training' | 'ready' | 'failed';
  system_prompt?: string;
  first_message?: string;
  model?: string;
  voice?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
}

const WEBHOOK_BASE_URL = 'https://primary-production-31de.up.railway.app/webhook';

export const webhookService = {
  /**
   * Get all assistants for a user
   * Combines local database with n8n workflow data
   */
  async getAssistants(userId: string): Promise<Assistant[]> {
    try {
      // 1. Get from local database first (fastest)
      const localAssistants = await this._getLocalAssistants(userId);
      
      // 2. Try to sync with n8n for any updates
      try {
        const syncResponse = await this._syncWithN8N(userId);
        if (syncResponse?.success && syncResponse.data?.length) {
          return this._mergeAssistants(localAssistants, syncResponse.data);
        }
      } catch (syncError) {
        console.warn('Sync with n8n failed:', syncError);
      }
      
      return localAssistants;
      
    } catch (error) {
      console.error('Error fetching assistants:', error);
      toast.error('Failed to load assistants');
      return [];
    }
  },

  /**
   * Create a new assistant using n8n workflow
   */
  async createAssistant(params: {
    name: string;
    first_message: string;
    system_prompt: string;
    user_id: string;
    model?: string;
    voice?: string;
  }): Promise<Assistant> {
    try {
      // 1. Create local record with 'draft' status
      const { data: newAssistant, error } = await supabase
        .from('assistants')
        .insert({
          ...params,
          status: 'draft',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Trigger n8n workflow to create the actual assistant
      const webhookResponse = await fetch(`${WEBHOOK_BASE_URL}/createassistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          local_id: newAssistant.id, // For callback updates
          action: 'create_assistant'
        }),
      });

      if (!webhookResponse.ok) {
        await this._updateAssistantStatus(newAssistant.id, 'failed');
        throw new Error('Webhook creation failed');
      }

      toast.success('Assistant creation started');
      return newAssistant;

    } catch (error) {
      console.error('Error creating assistant:', error);
      toast.error('Failed to create assistant');
      throw error;
    }
  },

  /**
   * Start a call using the n8n workflow
   */
  async startCall(params: {
    assistant_id: string;
    client_name: string;
    client_phone: string;
    user_id: string;
    metadata?: Record<string, any>;
  }): Promise<WebhookResponse> {
    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}/collowop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_call',
          ...params,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Call initiated successfully');
      } else {
        toast.warning('Call initiated but with warnings');
      }
      
      return result;

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to initiate call');
      throw error;
    }
  },

  /**
   * Trigger a call webhook (generic version)
   */
  async triggerCallWebhook(params: {
    action: string;
    campaign_id: number;
    client_id: number;
    client_name: string;
    client_phone: string;
    user_id: string;
    additional_data: Record<string, any>;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}/collowop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Webhook triggered successfully');
      } else {
        toast.warning(result.message || 'Webhook completed with warnings');
      }
      
      return result;

    } catch (error) {
      console.error('Error triggering webhook:', error);
      toast.error('Failed to trigger webhook');
      throw error;
    }
  },

  /**
   * Update an existing assistant
   */
  async updateAssistant(
    assistantId: string,
    updates: Partial<{
      name: string;
      system_prompt: string;
      first_message: string;
      model: string;
      voice: string;
      metadata: Record<string, any>;
    }>
  ): Promise<Assistant> {
    try {
      // 1. Update local record
      const { data: updatedAssistant, error } = await supabase
        .from('assistants')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', assistantId)
        .select()
        .single();

      if (error) throw error;

      // 2. Notify n8n about the update
      await fetch(`${WEBHOOK_BASE_URL}/updateassistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: updatedAssistant.assistant_id,
          updates,
          action: 'update_assistant'
        }),
      });

      toast.success('Assistant updated');
      return updatedAssistant;

    } catch (error) {
      console.error('Error updating assistant:', error);
      toast.error('Failed to update assistant');
      throw error;
    }
  },

  /**
   * Delete an assistant
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    try {
      // 1. Get assistant first to get the assistant_id
      const { data: assistant, error: fetchError } = await supabase
        .from('assistants')
        .select('assistant_id')
        .eq('id', assistantId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Delete from local database
      const { error: deleteError } = await supabase
        .from('assistants')
        .delete()
        .eq('id', assistantId);

      if (deleteError) throw deleteError;

      // 3. Notify n8n to delete from external services
      await fetch(`${WEBHOOK_BASE_URL}/deleteassistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: assistant.assistant_id,
          action: 'delete_assistant'
        }),
      });

      toast.success('Assistant deleted');

    } catch (error) {
      console.error('Error deleting assistant:', error);
      toast.error('Failed to delete assistant');
      throw error;
    }
  },

  // ==================== PRIVATE METHODS ====================

  async _getLocalAssistants(userId: string): Promise<Assistant[]> {
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching local assistants:', error);
      return [];
    }
    return data || [];
  },

  async _syncWithN8N(userId: string): Promise<WebhookResponse | null> {
    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: userId,
          action: 'sync_assistants'
        }),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Sync with n8n failed:', error);
      return null;
    }
  },

  _mergeAssistants(local: Assistant[], remote: Assistant[]): Assistant[] {
    const merged = [...local];
    
    remote.forEach(remoteAssistant => {
      const existingIndex = merged.findIndex(a => a.assistant_id === remoteAssistant.assistant_id);
      
      if (existingIndex >= 0) {
        // Update existing record
        merged[existingIndex] = { 
          ...merged[existingIndex], 
          ...remoteAssistant,
          updated_at: new Date().toISOString() 
        };
      } else {
        // Add new record
        merged.push(remoteAssistant);
      }
    });

    return merged;
  },

  async _updateAssistantStatus(
    assistantId: string,
    status: 'draft' | 'training' | 'ready' | 'failed'
  ): Promise<void> {
    await supabase
      .from('assistants')
      .update({ status })
      .eq('id', assistantId);
  }
};

// Type exports for easier usage in components
export type CreateAssistantParams = Parameters<typeof webhookService.createAssistant>[0];
export type StartCallParams = Parameters<typeof webhookService.startCall>[0];
export type TriggerCallWebhookParams = Parameters<typeof webhookService.triggerCallWebhook>[0];
export type UpdateAssistantParams = Parameters<typeof webhookService.updateAssistant>[1];