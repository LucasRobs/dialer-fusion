import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface VapiAssistant {
  id: string;
  name: string;
  assistant_id: string;
  user_id: string;
  status?: string;
  created_at?: string;
  system_prompt?: string;
  first_message?: string;
  model?: string;
  voice?: string;
  metadata?: Record<string, any>;
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

const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";
const VAPI_API_URL = "https://api.vapi.ai";
const WEBHOOK_BASE_URL = 'https://primary-production-31de.up.railway.app/webhook';

export const webhookService = {
  /**
   * Busca todos os assistentes de um usuário
   */
  async getAllAssistants(userId: string): Promise<VapiAssistant[]> {
    try {
      console.log(`Buscando assistentes para o usuário ${userId}`);

      // 1. Busca assistentes no banco de dados local primeiro
      const localAssistants = await this.getLocalAssistants(userId);
      
      // 2. Busca na API do VAPI
      try {
        const response = await fetch(`${VAPI_API_URL}/assistant`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Falha ao buscar assistentes da VAPI:', response.status, response.statusText);
          return localAssistants;
        }

        const vapiAssistants = await response.json();
        console.log('Assistentes recuperados da VAPI:', vapiAssistants);
        
        const userAssistants = vapiAssistants.filter((assistant: any) => 
          assistant.metadata?.user_id === userId
        );
        
        console.log(`Filtrados ${userAssistants.length} assistentes para o usuário ${userId}:`, userAssistants);

        // Combina e remove duplicatas
        const combined = this.combineAssistants(localAssistants, userAssistants);
        
        // Atualiza cache
        if (userAssistants.length > 0) {
          await this.cacheAssistants(userAssistants, userId);
        }
        
        return combined;
      } catch (apiError) {
        console.error('Erro na API VAPI:', apiError);
        return localAssistants;
      }
      
    } catch (error) {
      console.error('Erro ao buscar assistentes:', error);
      throw error;
    }
  },

  /**
   * Busca assistentes locais
   */
  async getLocalAssistants(userId: string): Promise<VapiAssistant[]> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar assistentes locais:', error);
        return [];
      }

      console.log(`Encontrados ${data?.length || 0} assistentes locais para o usuário ${userId}:`, data);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar assistentes locais:', error);
      return [];
    }
  },

  /**
   * Cria um novo assistente para o usuário (completo)
   */
  async createAssistant(params: {
    name: string;
    first_message: string;
    system_prompt: string;
    userId: string;
  }): Promise<VapiAssistant> {
    try {
      console.log('Iniciando criação de assistente com parâmetros:', params);
      
      const response = await fetch(`${WEBHOOK_BASE_URL}/createassistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: params.name,
          model: { provider: 'openai', model: 'gpt-3.5-turbo' },
          voice: { provider: '11labs', voiceId: 'rachel' },
          firstMessage: params.first_message,
          instructions: params.system_prompt,
          metadata: {
            user_id: params.userId,
            created_at: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta do webhook de criação:', response.status, response.statusText, errorText);
        throw new Error(`Erro ao criar assistente: ${response.statusText} - ${errorText}`);
      }

      const vapiAssistant = await response.json();
      console.log('Resposta do webhook de criação:', vapiAssistant);

      // Salva no banco de dados local - Removendo o campo metadata que não existe na tabela
      const { data: assistantData, error: dbError } = await supabase
        .from('assistants')
        .insert({
          name: params.name,
          assistant_id: vapiAssistant.id,
          system_prompt: params.system_prompt,
          first_message: params.first_message,
          user_id: params.userId,
          status: 'ready'
          // Removido o campo metadata que estava causando o erro
        })
        .select()
        .single();

      if (dbError) {
        console.error('Erro ao salvar assistente no banco de dados:', dbError);
        throw dbError;
      }

      console.log('Assistente salvo no banco de dados:', assistantData);
      
      // Atualiza o localStorage com o novo assistente
      localStorage.setItem('selected_assistant', JSON.stringify(assistantData));
      
      // Notificar sucesso
      toast.success(`Assistente "${params.name}" criado com sucesso!`);
      
      return assistantData;
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      toast.error(`Erro ao criar assistente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  },

  /**
   * Dispara webhook de chamada
   */
  async triggerCallWebhook(payload: WebhookPayload): Promise<{ success: boolean }> {
    try {
      // Get selected assistant from localStorage if available
      try {
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          const assistantData = JSON.parse(storedAssistant);
          // Append selected assistant data to additional_data if not already present
          if (!payload.additional_data) {
            payload.additional_data = {};
          }
          payload.additional_data.assistant_id = assistantData.assistant_id;
          payload.additional_data.assistant_name = assistantData.name;
          console.log('Added selected assistant data to webhook payload:', assistantData);
        }
      } catch (e) {
        console.error('Error parsing stored assistant data:', e);
      }
      
      const response = await fetch(`${WEBHOOK_BASE_URL}/collowop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta do webhook de chamada:', response.status, response.statusText, errorText);
        throw new Error(`Erro no webhook: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro ao acionar webhook:', error);
      throw error;
    }
  },

  /**
   * Fazer uma chamada para um cliente
   */
  async makeCall(clientId: number, phoneNumber: string, campaignId: number): Promise<{ success: boolean, message?: string, data?: any }> {
    try {
      console.log(`Iniciando chamada para cliente ${clientId} - ${phoneNumber} - campanha ${campaignId}`);
      
      // Get selected assistant from localStorage
      let selectedAssistant = null;
      try {
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          selectedAssistant = JSON.parse(storedAssistant);
          console.log('Using stored assistant for call:', selectedAssistant);
        }
      } catch (e) {
        console.error('Error parsing stored assistant data:', e);
      }
      
      const response = await fetch(`${WEBHOOK_BASE_URL}/collowop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'make_call',
          clientId,
          phoneNumber,
          campaignId,
          assistant_id: selectedAssistant?.assistant_id,
          assistant_name: selectedAssistant?.name
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

  /**
   * Métodos auxiliares
   */
  async cacheAssistants(assistants: any[], userId: string): Promise<void> {
    try {
      await Promise.all(
        assistants.map(async (assistant) => {
          const { error } = await supabase
            .from('assistants')
            .upsert({
              assistant_id: assistant.id,
              name: assistant.name,
              user_id: userId,
              status: assistant.status,
              created_at: assistant.createdAt,
              system_prompt: assistant.instructions,
              first_message: assistant.firstMessage
              // Removed metadata field that was causing errors
            }, { onConflict: 'assistant_id' });

          if (error) {
            console.error('Erro ao salvar assistente no cache:', error);
          }
        })
      );
    } catch (error) {
      console.error('Erro ao armazenar assistentes em cache:', error);
    }
  },

  mapVapiAssistantToLocalFormat(assistant: any): VapiAssistant {
    return {
      id: assistant.id,
      name: assistant.name,
      assistant_id: assistant.id,
      user_id: assistant.metadata?.user_id || '',
      status: assistant.status,
      created_at: assistant.createdAt,
      system_prompt: assistant.instructions,
      first_message: assistant.firstMessage,
      model: assistant.model,
      voice: assistant.voice,
      metadata: assistant.metadata
    };
  },

  combineAssistants(local: VapiAssistant[], remote: any[]): VapiAssistant[] {
    const remoteMapped: VapiAssistant[] = remote.map(this.mapVapiAssistantToLocalFormat);
    const combined = [...local];
    
    remoteMapped.forEach(remoteAssistant => {
      if (!combined.some(a => a.assistant_id === remoteAssistant.assistant_id)) {
        combined.push(remoteAssistant);
      }
    });

    console.log(`Combinados ${combined.length} assistentes (${local.length} locais + ${remoteMapped.length} remotos)`);
    return combined;
  },
};

export default webhookService;
