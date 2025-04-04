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

const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";
const VAPI_API_URL = "https://api.vapi.ai";

export const webhookService = {
  /**
   * Cria um novo assistente virtual e registra no banco de dados
   */
  async createAssistant(params: AssistantCreationParams): Promise<WebhookResponse> {
    try {
      console.log('Criando assistente com parâmetros:', params);

      // 1. Primeiro cria o assistente na Vapi
      const vapiResponse = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: params.assistant_name,
          model: { provider: 'openai', model: 'gpt-3.5-turbo' },
          voice: { provider: '11labs', voiceId: 'rachel' },
          firstMessage: params.first_message,
          instructions: params.system_prompt,
        }),
      });

      if (!vapiResponse.ok) {
        const errorText = await vapiResponse.text();
        throw new Error(`Erro ao criar assistente na Vapi: ${vapiResponse.statusText} - ${errorText}`);
      }

      const vapiData = await vapiResponse.json();
      console.log('Assistente criado na Vapi:', vapiData);

      // 2. Obtém o ID do usuário atual
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      
      const userId = authData?.session?.user?.id;
      if (!userId) throw new Error('ID do usuário não encontrado');

      // 3. Salva no banco de dados local
      const { data: assistantData, error: dbError } = await supabase
        .from('assistants')
        .insert({
          name: params.assistant_name,
          assistant_id: vapiData.id,
          system_prompt: params.system_prompt,
          first_message: params.first_message,
          user_id: userId,
          status: 'ready',
          metadata: {
            vapi_data: vapiData,
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Armazena localmente
      localStorage.setItem('selected_assistant', JSON.stringify(assistantData));

      return {
        success: true,
        message: 'Assistente criado com sucesso',
        data: assistantData
      };
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  /**
   * Obtém todos os assistentes de um usuário específico
   */
  async getAssistantsForUser(userId: string): Promise<VapiAssistant[]> {
    try {
      console.log(`Buscando assistentes para o usuário ${userId}`);

      // 1. Verifica assistentes armazenados localmente
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const assistant = JSON.parse(storedAssistant);
        if (assistant.user_id === userId) {
          return [assistant];
        }
      }

      // 2. Busca no banco de dados local
      const { data: dbAssistants, error: dbError } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      if (dbAssistants && dbAssistants.length > 0) {
        return dbAssistants;
      }

      // 3. Se não encontrou localmente, busca na API da Vapi
      const vapiResponse = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!vapiResponse.ok) {
        const errorText = await vapiResponse.text();
        throw new Error(`Erro ao buscar assistentes: ${vapiResponse.statusText} - ${errorText}`);
      }

      const vapiAssistants = await vapiResponse.json();

      // Filtra apenas os assistentes do usuário atual
      const userAssistants = vapiAssistants.filter((assistant: any) => 
        assistant.metadata?.user_id === userId
      );

      // Salva os assistentes no banco de dados para cache
      if (userAssistants.length > 0) {
        await Promise.all(
          userAssistants.map(async (assistant: any) => {
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

            if (error) console.error('Erro ao salvar assistente:', error);
          })
        );
      }

      return userAssistants.map((assistant: any) => ({
        id: assistant.id,
        name: assistant.name,
        assistant_id: assistant.id,
        user_id: userId,
        status: assistant.status,
        created_at: assistant.createdAt,
        system_prompt: assistant.instructions,
        first_message: assistant.firstMessage,
        metadata: assistant.metadata
      }));

    } catch (error) {
      console.error('Erro ao buscar assistentes:', error);
      throw error;
    }
  },

  /**
   * Inicia uma chamada usando um assistente Vapi
   */
  async makeCall(clientPhone: string, assistantId: string): Promise<WebhookResponse> {
    try {
      console.log(`Iniciando chamada para ${clientPhone} com assistente ${assistantId}`);

      const response = await fetch(`${VAPI_API_URL}/call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId,
          phone: {
            number: clientPhone
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao iniciar chamada: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Chamada iniciada com sucesso',
        data
      };
    } catch (error) {
      console.error('Erro ao fazer chamada:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  /**
   * Obtém os detalhes de um assistente específico
   */
  async getAssistantDetails(assistantId: string): Promise<VapiAssistant> {
    try {
      // Primeiro tenta buscar do banco de dados local
      const { data: localAssistant, error: localError } = await supabase
        .from('assistants')
        .select('*')
        .eq('assistant_id', assistantId)
        .single();

      if (!localError && localAssistant) {
        return localAssistant;
      }

      // Se não encontrou localmente, busca na Vapi
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

      // Converte para o formato VapiAssistant
      return {
        id: vapiAssistant.id,
        name: vapiAssistant.name,
        assistant_id: vapiAssistant.id,
        user_id: vapiAssistant.metadata?.user_id || '',
        status: vapiAssistant.status,
        created_at: vapiAssistant.createdAt,
        system_prompt: vapiAssistant.instructions,
        first_message: vapiAssistant.firstMessage,
        metadata: vapiAssistant.metadata
      };
    } catch (error) {
      console.error('Erro ao buscar detalhes do assistente:', error);
      throw error;
    }
  },

  /**
   * Atualiza um assistente existente
   */
  async updateAssistant(assistantId: string, updates: Partial<VapiAssistant>): Promise<WebhookResponse> {
    try {
      // 1. Atualiza na Vapi
      const vapiResponse = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name,
          instructions: updates.system_prompt,
          firstMessage: updates.first_message,
          metadata: updates.metadata
        }),
      });

      if (!vapiResponse.ok) {
        const errorText = await vapiResponse.text();
        throw new Error(`Erro ao atualizar assistente: ${vapiResponse.statusText} - ${errorText}`);
      }

      const vapiData = await vapiResponse.json();

      // 2. Atualiza no banco de dados local
      const { data: assistantData, error: dbError } = await supabase
        .from('assistants')
        .update({
          name: updates.name,
          system_prompt: updates.system_prompt,
          first_message: updates.first_message,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('assistant_id', assistantId)
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Atualiza localmente se for o assistente selecionado
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const currentAssistant = JSON.parse(storedAssistant);
        if (currentAssistant.assistant_id === assistantId) {
          localStorage.setItem('selected_assistant', JSON.stringify(assistantData));
        }
      }

      return {
        success: true,
        message: 'Assistente atualizado com sucesso',
        data: assistantData
      };
    } catch (error) {
      console.error('Erro ao atualizar assistente:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  },

  /**
   * Remove um assistente
   */
  async deleteAssistant(assistantId: string): Promise<WebhookResponse> {
    try {
      // 1. Remove da Vapi
      const vapiResponse = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!vapiResponse.ok) {
        const errorText = await vapiResponse.text();
        throw new Error(`Erro ao remover assistente: ${vapiResponse.statusText} - ${errorText}`);
      }

      // 2. Remove do banco de dados local
      const { error: dbError } = await supabase
        .from('assistants')
        .delete()
        .eq('assistant_id', assistantId);

      if (dbError) throw dbError;

      // 3. Remove do localStorage se for o assistente selecionado
      const storedAssistant = localStorage.getItem('selected_assistant');
      if (storedAssistant) {
        const currentAssistant = JSON.parse(storedAssistant);
        if (currentAssistant.assistant_id === assistantId) {
          localStorage.removeItem('selected_assistant');
        }
      }

      return {
        success: true,
        message: 'Assistente removido com sucesso'
      };
    } catch (error) {
      console.error('Erro ao remover assistente:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
};

export default webhookService;