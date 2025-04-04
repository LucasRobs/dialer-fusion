import { supabase } from '@/lib/supabase';

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

export const webhookService = {
  /**
   * Busca todos os assistentes (alias para getAssistantsByUser)
   */
  async getAllAssistants(userId: string): Promise<VapiAssistant[]> {
    try {
      return await this.getAssistantsByUser(userId);
    } catch (error) {
      console.error('Erro em getAllAssistants:', error);
      throw error;
    }
  },

  /**
   * Busca todos os assistentes de um usuário específico
   */
  async getAssistantsByUser(userId: string): Promise<VapiAssistant[]> {
    try {
      console.log(`Buscando assistentes para o usuário ${userId}`);

      // 1. Busca assistentes no banco de dados local primeiro
      const localAssistants = await this.getLocalAssistants(userId);
      if (localAssistants.length > 0) {
        return localAssistants;
      }

      // 2. Se não encontrou localmente, busca na API do VAPI
      const response = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar assistentes: ${response.statusText} - ${errorText}`);
      }

      const vapiAssistants = await response.json();

      // Filtra apenas os assistentes do usuário atual
      const userAssistants = vapiAssistants.filter((assistant: any) => 
        assistant.metadata?.user_id === userId
      );

      // Salva os assistentes no banco de dados para cache
      if (userAssistants.length > 0) {
        await this.cacheAssistants(userAssistants, userId);
      }

      return userAssistants.map(this.mapVapiAssistantToLocalFormat);
      
    } catch (error) {
      console.error('Erro ao buscar assistentes:', error);
      throw error;
    }
  },

  /**
   * Busca assistentes no banco de dados local por user_id
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
   * Cria um novo assistente via API local
   */
  async createAssistant(data: { 
    assistant_name: string; 
    first_message: string; 
    system_prompt: string;
    user_id: string;
  }): Promise<WebhookResponse> {
    try {
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/createassistant', {
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
      console.error('Erro ao criar assistente via API local:', error);
      throw error;
    }
  },

  /**
   * Armazena assistentes no banco de dados local para cache
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

  /**
   * Converte o formato do assistente da VAPI para nosso formato local
   */
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

  /**
   * Obtém detalhes de um assistente específico
   */
  async getAssistantDetails(assistantId: string, userId: string): Promise<VapiAssistant> {
    try {
      // 1. Tenta buscar do banco de dados local primeiro
      const { data: localAssistant, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('assistant_id', assistantId)
        .eq('user_id', userId)
        .single();

      if (!error && localAssistant) {
        return localAssistant;
      }

      // 2. Se não encontrou localmente, busca na VAPI
      const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar assistente: ${response.statusText} - ${errorText}`);
      }

      const vapiAssistant = await response.json();

      // Verifica se o assistente pertence ao usuário
      if (vapiAssistant.metadata?.user_id !== userId) {
        throw new Error('Assistente não pertence ao usuário');
      }

      // Atualiza o cache local
      await this.cacheAssistants([vapiAssistant], userId);

      return this.mapVapiAssistantToLocalFormat(vapiAssistant);
    } catch (error) {
      console.error('Erro ao buscar detalhes do assistente:', error);
      throw error;
    }
  },

  /**
   * Cria um novo assistente para o usuário
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
   * Atualiza um assistente do usuário
   */
  async updateUserAssistant(
    assistantId: string, 
    userId: string,
    updates: Partial<{
      name: string;
      system_prompt: string;
      first_message: string;
    }>
  ): Promise<VapiAssistant> {
    try {
      // Primeiro verifica se o assistente pertence ao usuário
      const existingAssistant = await this.getAssistantDetails(assistantId, userId);

      const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name || existingAssistant.name,
          instructions: updates.system_prompt || existingAssistant.system_prompt,
          firstMessage: updates.first_message || existingAssistant.first_message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao atualizar assistente: ${response.statusText} - ${errorText}`);
      }

      const vapiAssistant = await response.json();

      // Atualiza no banco de dados local
      const { data: assistantData, error: dbError } = await supabase
        .from('assistants')
        .update({
          name: updates.name,
          system_prompt: updates.system_prompt,
          first_message: updates.first_message,
          updated_at: new Date().toISOString()
        })
        .eq('assistant_id', assistantId)
        .eq('user_id', userId)
        .select()
        .single();

      if (dbError) throw dbError;

      return assistantData;
    } catch (error) {
      console.error('Erro ao atualizar assistente:', error);
      throw error;
    }
  },

  /**
   * Remove um assistente do usuário
   */
  async deleteUserAssistant(assistantId: string, userId: string): Promise<void> {
    try {
      // Primeiro verifica se o assistente pertence ao usuário
      await this.getAssistantDetails(assistantId, userId);

      const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao remover assistente: ${response.statusText} - ${errorText}`);
      }

      // Remove do banco de dados local
      const { error: dbError } = await supabase
        .from('assistants')
        .delete()
        .eq('assistant_id', assistantId)
        .eq('user_id', userId);

      if (dbError) throw dbError;

      // Remove do localStorage se for o assistente selecionado
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const currentAssistant = JSON.parse(storedAssistant);
        if (currentAssistant.assistant_id === assistantId) {
          localStorage.removeItem('selected_assistant');
        }
      }
    } catch (error) {
      console.error('Erro ao remover assistente:', error);
      throw error;
    }
  },

  /**
   * Dispara um webhook para iniciar uma chamada
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
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao acionar webhook: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao acionar webhook de chamada:', error);
      throw error;
    }
  }
};

export default webhookService;