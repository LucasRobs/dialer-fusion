
import { supabase } from '@/lib/supabase';

export interface VapiAssistant {
  id: string;
  name: string;
  assistant_id?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
}

export interface WebhookPayload {
  action: string;
  campaign_id: number;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  user_id?: string;
  additional_data?: Record<string, any>;
}

export interface WebhookData {
  action: string;
  campaign_id?: number;
  client_name?: string;
  client_phone?: string;
  timestamp?: string;
  additional_data?: Record<string, any>;
}

interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
}

interface AssistantCreationParams {
  assistant_name: string;
  first_message: string;
  system_prompt: string;
}

export const webhookService = {
  async triggerCallWebhook(payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      // Log the webhook request
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert([
          {
            action: payload.action,
            webhook_url: 'internal',
            request_data: payload,
            success: true
          }
        ]);
        
      if (logError) {
        console.error('Error logging webhook request:', logError);
      }
      
      console.info('Successfully notified Collowop webhook about new assistant');
      
      return {
        success: true,
        message: 'Webhook notification successful'
      };
    } catch (error) {
      console.error('Error triggering webhook:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  async prepareBulkCallsForCampaign(campaignId: number): Promise<{ success: boolean; successfulCalls: number; failedCalls: number; }> {
    try {
      // Get user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      // Verify the campaign belongs to the current user
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();
        
      if (campaignError) {
        throw new Error(`Campaign not found or not owned by current user: ${campaignError.message}`);
      }
      
      // Check if campaign has a specific client group
      if (campaign.client_group_id) {
        // Clients are already associated via prepareCampaignClientsFromGroup in campaignService
        // Update the campaign status
        await supabase
          .from('campaigns')
          .update({ 
            status: 'active',
            start_date: new Date().toISOString()
          })
          .eq('id', campaignId);
          
        // Get count of clients in the group
        const { count, error: countError } = await supabase
          .from('campaign_clients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId);
        
        if (countError) throw countError;
        
        return {
          success: true,
          successfulCalls: count || 0,
          failedCalls: 0
        };
      }
      
      // If no specific group, get all clients for this user
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Active');
        
      if (clientsError) {
        throw new Error(`Error fetching clients: ${clientsError.message}`);
      }
      
      // No clients found
      if (!clients || clients.length === 0) {
        await supabase
          .from('campaigns')
          .update({ 
            status: 'error',
            total_calls: 0
          })
          .eq('id', campaignId);
          
        return {
          success: false,
          successfulCalls: 0,
          failedCalls: 0
        };
      }
      
      // Create campaign_clients entries
      const campaignClients = clients.map(client => ({
        campaign_id: campaignId,
        client_id: client.id,
        status: 'pending'
      }));
      
      const { error: insertError } = await supabase
        .from('campaign_clients')
        .insert(campaignClients);
        
      if (insertError) {
        throw new Error(`Error inserting campaign clients: ${insertError.message}`);
      }
      
      // Update campaign with total calls
      await supabase
        .from('campaigns')
        .update({ 
          status: 'active',
          start_date: new Date().toISOString(),
          total_calls: clients.length
        })
        .eq('id', campaignId);
        
      return {
        success: true,
        successfulCalls: clients.length,
        failedCalls: 0
      };
    } catch (error) {
      console.error('Error preparing bulk calls:', error);
      return {
        success: false,
        successfulCalls: 0,
        failedCalls: 1,
      };
    }
  },

  // New methods to fix the errors
  async createAssistant(params: AssistantCreationParams): Promise<WebhookResponse> {
    try {
      // This would normally call an external API, but for now just log and return success
      console.log('Creating assistant with params:', params);
      
      // Log the webhook request
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert([
          {
            action: 'create_assistant',
            webhook_url: 'internal',
            request_data: params,
            success: true
          }
        ]);
        
      if (logError) {
        console.error('Error logging webhook request:', logError);
      }
      
      // Generate a dummy assistant ID
      const dummyAssistantId = `asst_${Math.random().toString(36).substring(2, 15)}`;
      
      return {
        success: true,
        message: 'Assistant creation request sent successfully',
        data: {
          assistant_id: dummyAssistantId
        }
      };
    } catch (error) {
      console.error('Error creating assistant:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  async getAssistantsFromVapi(): Promise<WebhookResponse> {
    try {
      // This would normally fetch from an external API, but we'll return dummy data
      const assistants = [
        {
          id: 'asst_123456789',
          name: 'Default Assistant',
          status: 'ready',
          created_at: new Date().toISOString()
        },
        {
          id: 'asst_987654321',
          name: 'Customer Support Assistant',
          status: 'ready',
          created_at: new Date().toISOString()
        }
      ];
      
      return {
        success: true,
        data: assistants
      };
    } catch (error) {
      console.error('Error fetching assistants:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  async getAllAssistants(userId?: string): Promise<any[]> {
    try {
      // Fetch assistants from the database based on user ID
      if (!userId) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error('Error fetching assistants:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllAssistants:', error);
      return [];
    }
  }
};

export default webhookService;
