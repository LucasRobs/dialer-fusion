import { supabase } from '@/lib/supabase';
import assistantService, { Assistant } from './assistantService';

// URL do webhook corrigida para o serviço de ligações
const WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook/collowop';
const VAPI_ASSISTANT_WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook/createassistant';
const VAPI_GET_ASSISTANTS_URL = 'https://primary-production-31de.up.railway.app/webhook/getassistants';

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

export interface AssistantWebhookData {
  assistant_name: string;
  first_message: string;
  system_prompt: string;
  timestamp: string;
  additional_data?: Record<string, any>;
}

// Interface para o assistente de IA
export interface VapiAssistant {
  id: string;
  name: string;
  assistant_id?: string;
  date?: string;
  status?: string;
}

// Interface para o log do webhook
interface WebhookLog {
  webhook_url: string;
  request_data: WebhookData | AssistantWebhookData;
  success: boolean;
  error_message: string | null;
  action: string;
  response_data?: any;
}

// Serviço para gerenciar webhooks
export const webhookService = {
  // Função para buscar todos os assistentes do usuário
  async getAllAssistants(userId?: string): Promise<VapiAssistant[]> {
    try {
      // First try to get assistants from Vapi through n8n
      try {
        const response = await fetch(VAPI_GET_ASSISTANTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            timestamp: new Date().toISOString()
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.assistants && Array.isArray(data.assistants)) {
            console.log('Successfully retrieved assistants from Vapi:', data.assistants);
            // Update local database with latest data from Vapi
            data.assistants.forEach(async (vapiAssistant: any) => {
              const existingAssistant = await assistantService.getAssistantById(vapiAssistant.assistant_id);
              if (!existingAssistant && vapiAssistant.assistant_id) {
                await assistantService.saveAssistant({
                  name: vapiAssistant.name,
                  assistant_id: vapiAssistant.assistant_id,
                  user_id: userId,
                  status: 'ready'
                });
              }
            });
            return data.assistants;
          }
        }
      } catch (vapiError) {
        console.error('Error fetching assistants from Vapi:', vapiError);
        // Continue with local data if Vapi fails
      }
      
      // Fallback to local database
      const assistants = await assistantService.getAllAssistants(userId);
      return assistants.map(assistant => ({
        id: assistant.id,
        name: assistant.name,
        assistant_id: assistant.assistant_id,
        date: assistant.created_at,
        status: assistant.status || 'ready'
      }));
    } catch (error) {
      console.error('Error getting assistants:', error);
      
      // Default assistant sempre disponível
      return [{
        id: 'default-assistant',
        name: 'Default Assistant',
        date: new Date().toISOString(),
        status: 'ready'
      }];
    }
  },
  
  // Função para disparar o webhook
  async triggerCallWebhook(data: Omit<WebhookData, 'timestamp'>) {
    console.log('Disparando webhook para ligação:', data);
    
    // Adiciona timestamp
    const webhookData: WebhookData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    // Adiciona o assistant name nas informações adicionais se não existir
    if (!webhookData.additional_data) {
      webhookData.additional_data = {};
    }
    
    // Get assistant information from localStorage if available
    let assistantName = "Default Assistant";
    let assistantId = "";
    
    try {
      // Se o additional_data já tiver um assistant_name, use-o
      if (webhookData.additional_data.assistant_name) {
        assistantName = webhookData.additional_data.assistant_name;
        assistantId = webhookData.additional_data.assistant_id || "";
        console.log('Using provided assistant name:', assistantName);
      } 
      // Se não tiver, verifica se há um assistente selecionado no localStorage
      else if (localStorage.getItem('selected_assistant')) {
        const selectedAssistant = JSON.parse(localStorage.getItem('selected_assistant') || '');
        if (selectedAssistant) {
          assistantName = selectedAssistant.name || "Default Assistant";
          assistantId = selectedAssistant.assistant_id || "";
          console.log('Using selected assistant name from localStorage:', assistantName);
        }
      }
    } catch (e) {
      console.error('Error getting assistant name:', e);
    }
    
    // Certifica que o assistant name e ID estão configurados
    webhookData.additional_data.assistant_name = assistantName;
    if (assistantId) {
      webhookData.additional_data.assistant_id = assistantId;
    }
    
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
  
  // Função para criar um novo assistente via webhook
  async createAssistant(data: Omit<AssistantWebhookData, 'timestamp'>) {
    console.log('Criando novo assistente:', data);
    
    // Adiciona timestamp
    const webhookData: AssistantWebhookData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Envia requisição para o webhook
      const response = await fetch(VAPI_ASSISTANT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });
      
      const responseData = await response.json();
      console.log('Resposta do webhook de assistente:', responseData);
      
      // Registra a chamada no histórico
      await this.logWebhookCall(webhookData, response.ok, 'create_assistant');
      
      return { 
        success: response.ok, 
        status: response.status,
        data: responseData
      };
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      await this.logWebhookCall(webhookData, false, 'create_assistant', error);
      return { success: false, error };
    }
  },
  
  // Função para selecionar um assistente para uso
  async selectAssistant(assistantId: string) {
    try {
      const assistant = await assistantService.selectAssistant(assistantId);
      return !!assistant;
    } catch (error) {
      console.error('Erro ao selecionar assistente:', error);
      return false;
    }
  },
  
  // Função para registrar a chamada do webhook no histórico
  async logWebhookCall(data: WebhookData | AssistantWebhookData, success: boolean, action?: string, error?: any) {
    try {
      const webhookUrl = 'action' in data ? WEBHOOK_URL : VAPI_ASSISTANT_WEBHOOK_URL;
      const actionValue = 'action' in data ? data.action : (action || 'create_assistant');
      
      const logData: WebhookLog = {
        webhook_url: webhookUrl,
        request_data: data,
        success,
        error_message: error ? String(error) : null,
        action: actionValue
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
      
      // Get selected assistant name from localStorage
      let assistantName = "Default Assistant";
      let assistantId = "";
      
      try {
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          const assistantData = JSON.parse(storedAssistant);
          if (assistantData && assistantData.name) {
            assistantName = assistantData.name;
            assistantId = assistantData.assistant_id || "";
            console.log('Using stored assistant name for bulk calls:', assistantName);
          }
        }
      } catch (e) {
        console.error('Error parsing stored assistant data:', e);
      }
      
      // Prepara os dados para o webhook
      const bulkCallData: Omit<WebhookData, 'timestamp'>[] = campaignClients.map((client: any) => ({
        action: 'start_call',
        campaign_id: campaignId,
        client_id: client.client_id,
        client_name: client.clients?.name,
        client_phone: client.clients?.phone,
        additional_data: {
          assistant_name: assistantName,
          assistant_id: assistantId,
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
