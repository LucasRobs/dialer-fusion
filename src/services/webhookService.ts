import { supabase } from '@/integrations/supabase/client';

// URL do webhook para o serviço de ligações
const WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook-test/collowop';

// Fixed Vapi API credentials - cannot be modified by users
const VAPI_API_CALLER_ID = "97141b30-c5bc-4234-babb-d38b79452e2a"; // Fixed Vapi caller ID
const VAPI_ASSISTANT_ID = "01646bac-c486-455b-bbc4-a2bc5a1da47c"; // Fixed Vapi Assistant ID

// Interface para os dados do webhook
export interface WebhookData {
  action: string;
  campaign_id?: number;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  timestamp: string;
  user_id?: string;
  additional_data?: Record<string, any>;
}

// Interface para o log do webhook
interface WebhookLog {
  webhook_url: string;
  request_data: WebhookData;
  success: boolean;
  error_message: string | null;
  action: string;
  response_data?: any;
}

// Serviço para gerenciar webhooks
export const webhookService = {
  // Função para disparar o webhook
  async triggerCallWebhook(data: Omit<WebhookData, 'timestamp'>) {
    console.log('Disparando webhook para ligação:', data);
    
    // Adiciona timestamp
    const webhookData: WebhookData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    // Adiciona o assistant ID nas informações adicionais se não existir
    if (!webhookData.additional_data) {
      webhookData.additional_data = {};
    }
    
    // Always ensure fixed IDs are used, regardless of what was passed
    webhookData.additional_data.vapi_caller_id = VAPI_API_CALLER_ID;
    webhookData.additional_data.vapi_assistant_id = VAPI_ASSISTANT_ID;
    
    try {
      // Envia requisição para o webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });
      
      // Registra a chamada no histórico
      await this.logWebhookCall(webhookData, response.ok);
      
      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('Erro ao disparar webhook:', error);
      await this.logWebhookCall(webhookData, false, error);
      return { success: false, error };
    }
  },
  
  // Função para registrar a chamada do webhook no histórico
  async logWebhookCall(data: WebhookData, success: boolean, error?: any) {
    try {
      const logData: WebhookLog = {
        webhook_url: WEBHOOK_URL,
        request_data: data,
        success,
        error_message: error ? String(error) : null,
        action: data.action
      };
      
      // Use the direct REST API URL instead of accessing protected properties
      const supabaseRestUrl = 'https://ovanntvqwzifxjrnnalr.supabase.co/rest/v1/webhook_logs';
      const supabaseApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8';
      
      const response = await fetch(supabaseRestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseApiKey,
          'Authorization': `Bearer ${supabaseApiKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(logData)
      });
      
      if (!response.ok) {
        console.error('Erro ao registrar log do webhook via REST:', await response.text());
      }
    } catch (err) {
      console.error('Erro ao registrar log do webhook:', err);
    }
  },
  
  // Função para buscar o histórico de chamadas webhook
  async getWebhookLogs(limit = 20) {
    try {
      // Use the direct REST API URL instead of accessing protected properties
      const supabaseRestUrl = 'https://ovanntvqwzifxjrnnalr.supabase.co/rest/v1/webhook_logs';
      const supabaseApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8';
      
      const response = await fetch(
        `${supabaseRestUrl}?select=*&order=created_at.desc&limit=${limit}`, 
        {
          headers: {
            'apikey': supabaseApiKey,
            'Authorization': `Bearer ${supabaseApiKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching webhook logs: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar logs do webhook:', error);
      throw error;
    }
  },
  
  // Função para verificar o status das automações do n8n
  async getN8nWorkflowStatus(workflowId?: string) {
    try {
      // Esta é uma simulação - em produção, você precisaria integrar com a API do n8n
      // ou receber atualizações de status via webhook
      return {
        status: 'running' as const,
        completedTasks: 45,
        totalTasks: 100,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao verificar status do workflow n8n:', error);
      throw error;
    }
  },
  
  // Nova função para preparar um lote de ligações para uma campanha
  async prepareBulkCallsForCampaign(campaignId: number) {
    try {
      // Busca todos os clientes associados à campanha
      const response = await fetch(
        `https://ovanntvqwzifxjrnnalr.supabase.co/rest/v1/campaign_clients?select=client_id,clients(name,phone)&campaign_id=eq.${campaignId}&status=eq.pending`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching campaign clients: ${response.statusText}`);
      }
      
      const campaignClients = await response.json();
      
      // Prepara os dados para o webhook
      const bulkCallData: Omit<WebhookData, 'timestamp'>[] = campaignClients.map((client: any) => ({
        action: 'start_call',
        campaign_id: campaignId,
        client_id: client.client_id,
        client_name: client.clients?.name,
        client_phone: client.clients?.phone,
        additional_data: {
          // Always use fixed IDs
          vapi_caller_id: VAPI_API_CALLER_ID,
          vapi_assistant_id: VAPI_ASSISTANT_ID,
          call_type: 'bulk_campaign'
        }
      }));
      
      // Envia os dados para o webhook
      const results = await Promise.all(
        bulkCallData.map(callData => this.triggerCallWebhook(callData))
      );
      
      return {
        success: results.every(r => r.success),
        totalCalls: results.length,
        successfulCalls: results.filter(r => r.success).length,
        failedCalls: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('Erro ao preparar lote de ligações:', error);
      throw error;
    }
  }
};
