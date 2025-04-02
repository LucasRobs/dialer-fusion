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
  // Webhook para criar assistente virtual
  async createAssistant(params: AssistantCreationParams): Promise<WebhookResponse> {
    try {
      console.log('Criando assistente com parâmetros:', params);
      
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/createassistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: params.assistant_name,
          firstMessage: params.first_message,
          prompt: params.system_prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta de erro do webhook:', errorText);
        throw new Error(`Erro ao criar assistente: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Assistente criado com sucesso:', data);
      
      return {
        success: true,
        message: 'Assistente criado com sucesso',
        data,
      };
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  // Buscar todos os assistentes para um usuário
  async getAllAssistants(userId?: string): Promise<VapiAssistant[]> {
    try {
      console.log('Buscando assistentes para o usuário:', userId);
      
      let query = supabase.from('assistants').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar assistentes:', error);
        return [];
      }
      
      console.log(`Encontrados ${data?.length || 0} assistentes`);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar assistentes:', error);
      return [];
    }
  },

  // Webhook para fazer a ligação
  async makeCall(clientId: number, phoneNumber: string, campaignId: number): Promise<WebhookResponse> {
    try {
      console.log(`Iniciando chamada para cliente ${clientId} - ${phoneNumber} - campanha ${campaignId}`);
      
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          phoneNumber,
          campaignId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao fazer ligação: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Ligação iniciada com sucesso',
        data,
      };
    } catch (error) {
      console.error('Erro ao fazer ligação:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },
  
  // Recuperar assistentes da Vapi
  async getAssistantsFromVapi(): Promise<WebhookResponse> {
    try {
      console.log('Buscando assistentes da Vapi');
      
      // Simulação de resposta para exemplificar funcionalidade
      // Na implementação real, isso faria uma requisição HTTP para a API da Vapi
      return {
        success: true,
        data: [
          { id: 'vapi-asst-1', name: 'Assistente de Vendas', status: 'active' },
          { id: 'vapi-asst-2', name: 'Assistente de Suporte', status: 'active' }
        ]
      };
    } catch (error) {
      console.error('Erro ao buscar assistentes da Vapi:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },
  
  // Acionar webhook com payload customizado
  async triggerCallWebhook(payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      console.log('Enviando payload para webhook:', payload);
      
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao acionar webhook: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Resposta do webhook:', data);
      
      return {
        success: true,
        message: 'Webhook acionado com sucesso',
        data,
      };
    } catch (error) {
      console.error('Erro ao acionar webhook:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },
  
  // Preparar chamadas em massa para uma campanha
  async prepareBulkCallsForCampaign(campaignId: number, clientIds: number[]): Promise<WebhookResponse> {
    try {
      console.log(`Preparando chamadas em massa para campanha ${campaignId} com ${clientIds.length} clientes`);
      
      // Aqui seria a implementação real que envia os dados para o webhook
      // Para demonstração, estamos retornando uma resposta simulada
      return {
        success: true,
        message: `Preparação para ${clientIds.length} chamadas iniciada com sucesso`,
        data: {
          campaign_id: campaignId,
          calls_scheduled: clientIds.length,
          estimated_start_time: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Erro ao preparar chamadas em massa:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
};

export default webhookService;
