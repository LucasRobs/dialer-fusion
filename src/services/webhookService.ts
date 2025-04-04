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

interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
}

const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";
const VAPI_API_URL = "https://api.vapi.ai";
const WEBHOOK_BASE_URL = 'https://primary-production-31de.up.railway.app/webhook';

export const webhookService = {
  /**
   * Busca todos os assistentes de um usuário
   */
  async getAssistantsByUser(userId: string): Promise<VapiAssistant[]> {
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
          console.error('Falha ao buscar assistentes da VAPI');
          return localAssistants;
        }

        const vapiAssistants = await response.json();
        const userAssistants = vapiAssistants.filter((assistant: any) => 
          assistant.metadata?.user_id === userId
        );

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

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar assistentes locais:', error);
      return [];
    }
  },

  /**
   * Cria um novo assistente (versão simplificada)
   */
  async createAssistant(data: { 
    assistant_name: string; 
    first_message: string; 
    system_prompt: string 
  }): Promise<WebhookResponse> {
    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}/createassistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao criar assistente: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      throw error;
    }
  },

  /**
   * Cria um novo assistente para o usuário (completo)
   */
  async createAssistantForUser(params: {
    name: string;
    first_message: string;
    system_prompt: string;
    userId: string;
  }): Promise<VapiAssistant> {
    try {
      const response = await fetch(`${VAPI_API_URL}/assistant`, {
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
        throw new Error(`Erro ao criar assistente: ${response.statusText} - ${errorText}`);
      }

      const vapiAssistant = await response.json();

      // Salva no banco de dados local
      const { data: assistantData, error: dbError } = await supabase
        .from('assistants')
        .insert({
          name: params.name,
          assistant_id: vapiAssistant.id,
          system_prompt: params.system_prompt,
          first_message: params.first_message,
          user_id: params.userId,
          status: 'ready',
          metadata: {
            vapi_data: vapiAssistant,
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return assistantData;
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      throw error;
    }
  },

  /**
   * Dispara webhook de chamada
   */
  async triggerCallWebhook(payload: {
    action: string;
    campaign_id: number;
    client_id: number;
    client_name: string;
    client_phone: string;
    user_id: string | undefined;
    additional_data: Record<string, any>;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${WEBHOOK_BASE_URL}/collowop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro no webhook: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao acionar webhook:', error);
      throw error;
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
              first_message: assistant.firstMessage,
              metadata: assistant.metadata
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

    return combined;
  },
};

export default webhookService;