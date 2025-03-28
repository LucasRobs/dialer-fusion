import { supabase } from '@/lib/supabase';
import assistantService, { Assistant } from './assistantService';

// URL do webhook corrigida para o serviço de ligações
const WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook/collowop';
const VAPI_ASSISTANT_WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook/createassistant';
const VAPI_API_URL = 'https://api.vapi.ai/assistant';
const VAPI_API_KEY = '494da5a9-4a54-4155-bffb-d7206bd72afd';

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

// Interface para os dados do webhook de assistentes
export interface AssistantWebhookData {
  assistant_name: string;
  first_message: string;
  system_prompt: string;
  timestamp?: string;
  additional_data?: Record<string, any>;
  user_id?: string;
}

// Interface para o assistente de IA - adicionando created_at
export interface VapiAssistant {
  id: string;
  name: string;
  assistant_id?: string;
  created_at?: string;
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
      // First try to get assistants directly from Vapi API
      console.log('Buscando assistentes do usuário:', userId);
      try {
        const response = await fetch(VAPI_API_URL, {
          method: 'GET',
          headers: {
            'Authorization': VAPI_API_KEY
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Resposta completa da API Vapi:', data);
          
          if (data && Array.isArray(data)) {
            console.log('Successfully retrieved assistants from Vapi:', data);
            
            // Convert Vapi format to our application format
            const assistants = data.map(vapiAssistant => ({
              id: vapiAssistant.id,
              name: vapiAssistant.name,
              assistant_id: vapiAssistant.id,
              date: new Date().toISOString(),
              status: 'ready'
            }));
            
            // Update local database with latest data from Vapi
            assistants.forEach(async (vapiAssistant) => {
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
            
            return assistants;
          }
        } else {
          console.error('Erro na resposta da API Vapi:', await response.text());
        }
      } catch (vapiError) {
        console.error('Error fetching assistants from Vapi API:', vapiError);
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
          assistantId = selectedAssistant.assistant_id || selectedAssistant.id || "";
          console.log('Using selected assistant name from localStorage:', assistantName);
          console.log('Using selected assistant ID from localStorage:', assistantId);
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
    
    // Fetch client details from Supabase if client_id is provided
    if (webhookData.client_id) {
      try {
        console.log(`Fetching client data for ID: ${webhookData.client_id}`);
        
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('name, phone')
          .eq('id', webhookData.client_id)
          .single();
        
        if (error) {
          console.error('Error fetching client data:', error);
        }
        
        if (clientData) {
          console.log('Client data fetched successfully:', clientData);
          webhookData.client_name = clientData.name;
          webhookData.client_phone = clientData.phone;
        } else {
          console.log('No client data found for ID:', webhookData.client_id);
        }
      } catch (error) {
        console.error('Exception when fetching client data:', error);
      }
    }
    
    // Ensure client_name and client_phone are set, even if just with placeholder values
    if (!webhookData.client_name) {
      webhookData.client_name = webhookData.client_name || 'Unknown Client';
    }
    
    if (!webhookData.client_phone) {
      webhookData.client_phone = webhookData.client_phone || 'No Phone';
    }
    
    console.log('Final webhook payload:', webhookData);
    
    try {
      // Envia requisição para o webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': VAPI_API_KEY
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
          'Authorization': VAPI_API_KEY
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
  
  // Função para obter assistentes diretamente da API Vapi
  async getAssistantsFromVapi() {
    console.log('Buscando assistentes diretamente da API Vapi');
    
    try {
      const response = await fetch(VAPI_API_URL, {
        method: 'GET',
        headers: {
          'Authorization': VAPI_API_KEY
        }
      });
      
      if (!response.ok) {
        console.error('Erro na resposta da API Vapi:', response.status, await response.text());
        return { 
          success: false, 
          status: response.status,
          message: 'Erro ao buscar assistentes do Vapi'
        };
      }
      
      const responseData = await response.json();
      console.log('Assistentes obtidos do Vapi:', responseData);
      
      return { 
        success: true, 
        status: response.status,
        data: responseData
      };
    } catch (error) {
      console.error('Erro ao buscar assistentes da API Vapi:', error);
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
  async logWebhookCall(data: WebhookData | AssistantWebhookData, success: boolean, action?: string | any, error?: any) {
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
  
  // Função para preparar um lote de ligações para uma campanha
  async prepareBulkCallsForCampaign(campaignId: number) {
    try {
      console.log(`Preparing bulk calls for campaign ID: ${campaignId}`);
      
      // Busca clientes diretos da tabela de clientes como solução alternativa
      const { data: allClients, error } = await supabase
        .from('clients')
        .select('*')
        .limit(10);  // Limitar a 10 clientes para teste
      
      if (error) {
        console.error(`Error fetching clients: ${error.message}`);
        throw new Error(`Error fetching clients: ${error.message}`);
      }
      
      console.log(`Clients fetched from clients table: ${allClients?.length || 0}`);
      
      if (!allClients || allClients.length === 0) {
        return {
          success: false,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          message: 'No clients found'
        }
      }
      
      // Get selected assistant name from localStorage
      let assistantName = "Default Assistant";
      let assistantId = "";
      
      try {
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          const assistantData = JSON.parse(storedAssistant);
          if (assistantData && assistantData.name) {
            assistantName = assistantData.name;
            assistantId = assistantData.assistant_id || assistantData.id || "";
            console.log('Using stored assistant name for bulk calls:', assistantName);
          }
        }
      } catch (e) {
        console.error('Error parsing stored assistant data:', e);
      }
      
      // Prepara os dados para o webhook - validando cada cliente
      const bulkCallData = allClients.map(client => {
        const callData = {
          action: 'start_call',
          campaign_id: campaignId,
          client_id: client.id,
          client_name: client.name || 'Cliente Sem Nome',
          client_phone: client.phone || 'Telefone Não Informado',
          additional_data: {
            assistant_name: assistantName,
            assistant_id: assistantId,
            call_type: 'bulk_campaign',
            client_details: true
          }
        };
        
        console.log(`Prepared webhook data for client ${client.id}:`, {
          name: callData.client_name,
          phone: callData.client_phone
        });
        
        return callData;
      });
      
      console.log(`Sending ${bulkCallData.length} calls to webhook`);
      
      // Envia os dados para o webhook
      const results = await Promise.all(
        bulkCallData.map(callData => this.triggerCallWebhook(callData))
      );
      
      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully sent ${successCount} out of ${results.length} calls`);
      
      return {
        success: results.some(r => r.success),
        totalCalls: results.length,
        successfulCalls: successCount,
        failedCalls: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('Erro ao preparar lote de ligações:', error);
      throw error;
    }
  }
};
