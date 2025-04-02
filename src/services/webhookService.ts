
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
        throw new Error(`Erro ao criar assistente: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
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

  // Webhook para fazer a ligação
  async makeCall(clientId: number, phoneNumber: string, campaignId: number): Promise<WebhookResponse> {
    try {
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
};

export default webhookService;
