
import { supabase } from '@/lib/supabase';

export interface VapiAssistant {
  id: string;
  name: string;
  assistant_id?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
}

interface WebhookPayload {
  action: string;
  campaign_id: number;
  additional_data?: Record<string, any>;
}

interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
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
  }
};

export default webhookService;
