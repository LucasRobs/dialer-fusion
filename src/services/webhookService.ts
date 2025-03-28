import { supabase } from '@/lib/supabase';

// URL do webhook corrigida para o serviço de ligações
const WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook/collowop';
const VAPI_ASSISTANT_WEBHOOK_URL = 'https://primary-production-31de.up.railway.app/webhook/createassistant';

// Configure here your Vapi API credentials
const VAPI_API_CALLER_ID = "97141b30-c5bc-4234-babb-d38b79452e2a"; // Vapi caller ID
const VAPI_ASSISTANT_ID = "01646bac-c486-455b-bbc4-a2bc5a1da47c"; // Vapi Assistant ID
const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd"; // Vapi API Key

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
  date?: string;
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
  getAllAssistants(): VapiAssistant[] {
    try {
      const storedAssistantsStr = localStorage.getItem('vapi_assistants');
      if (storedAssistantsStr) {
        return JSON.parse(storedAssistantsStr);
      }
    } catch (error) {
      console.error('Error parsing assistants from localStorage:', error);
    }
    
    // Default assistant sempre disponível
    return [{
      id: VAPI_ASSISTANT_ID,
      name: 'Default Vapi Assistant',
      date: new Date().toISOString()
    }];
  },
  
  // Função para salvar um novo assistente
  saveAssistant(assistant: VapiAssistant) {
    try {
      const currentAssistants = this.getAllAssistants();
      
      // Verifica se o assistente já existe
      const exists = currentAssistants.some(a => a.id === assistant.id);
      
      if (!exists) {
        // Adiciona o novo assistente à lista
        const updatedAssistants = [...currentAssistants, {
          ...assistant,
          date: new Date().toISOString()
        }];
        
        // Salva a lista atualizada
        localStorage.setItem('vapi_assistants', JSON.stringify(updatedAssistants));
      }
    } catch (error) {
      console.error('Error saving assistant to localStorage:', error);
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
    
    // Adiciona o assistant ID nas informações adicionais se não existir
    if (!webhookData.additional_data) {
      webhookData.additional_data = {};
    }
    
    // Check if we have a custom assistant ID specified
    let assistantId = VAPI_ASSISTANT_ID;
    
    // Se o additional_data já tiver um assistantId, use-o
    if (webhookData.additional_data.vapi_assistant_id) {
      assistantId = webhookData.additional_data.vapi_assistant_id;
      console.log('Using provided Vapi assistant ID:', assistantId);
    } 
    // Se não tiver, verifica se há um assistente selecionado no localStorage
    else if (localStorage.getItem('selected_assistant')) {
      try {
        const selectedAssistant = JSON.parse(localStorage.getItem('selected_assistant') || '');
        if (selectedAssistant && selectedAssistant.id) {
          assistantId = selectedAssistant.id;
          console.log('Using selected Vapi assistant ID:', assistantId);
        }
      } catch (e) {
        console.error('Error parsing selected assistant data:', e);
      }
    }
    
    // Certifica que o assistant ID está configurado
    webhookData.additional_data.vapi_assistant_id = assistantId;
    
    // Adiciona a API key da Vapi
    webhookData.additional_data.vapi_api_key = VAPI_API_KEY;
    
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
      
      // Registra a chamada no histórico
      await this.logWebhookCall(webhookData, response.ok, 'create_assistant');
      
      // Se a criação foi bem-sucedida e temos um ID no retorno, salva o assistente
      if (response.ok && responseData && responseData.assistant_id) {
        // Salva no localStorage para uso posterior
        const newAssistant: VapiAssistant = {
          id: responseData.assistant_id,
          name: data.assistant_name,
          date: new Date().toISOString()
        };
        
        // Salva como assistente atual
        localStorage.setItem('selected_assistant', JSON.stringify(newAssistant));
        
        // Adiciona à lista de assistentes
        this.saveAssistant(newAssistant);
      }
      
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
  selectAssistant(assistantId: string) {
    try {
      const assistants = this.getAllAssistants();
      const assistant = assistants.find(a => a.id === assistantId);
      
      if (assistant) {
        localStorage.setItem('selected_assistant', JSON.stringify(assistant));
        console.log('Assistente selecionado:', assistant.name);
        return true;
      }
      
      return false;
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
      
      // Check if we have a custom assistant ID in localStorage
      const storedAssistant = localStorage.getItem('vapi_assistant');
      let assistantId = VAPI_ASSISTANT_ID;
      
      if (storedAssistant) {
        try {
          const assistantData = JSON.parse(storedAssistant);
          if (assistantData && assistantData.id) {
            assistantId = assistantData.id;
            console.log('Using custom Vapi assistant ID for bulk calls:', assistantId);
          }
        } catch (e) {
          console.error('Error parsing stored assistant data:', e);
        }
      }
      
      // Prepara os dados para o webhook
      const bulkCallData: Omit<WebhookData, 'timestamp'>[] = campaignClients.map((client: any) => ({
        action: 'start_call',
        campaign_id: campaignId,
        client_id: client.client_id,
        client_name: client.clients?.name,
        client_phone: client.clients?.phone,
        additional_data: {
          vapi_caller_id: VAPI_API_CALLER_ID,
          vapi_assistant_id: assistantId,
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
