import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

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
        
        // Filter assistants by user_id from metadata
        const userAssistants = vapiAssistants.filter((assistant: any) => {
          if (assistant && assistant.metadata && assistant.metadata.user_id) {
            return assistant.metadata.user_id === userId;
          }
          return false;
        });
        
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


  async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`Deletando assistente ${assistantId}`);
      
      // 1. Get assistant details to find Vapi assistant_id
      const { data: assistant, error: fetchError } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
      
      if (fetchError || !assistant) {
        console.error('Erro ao buscar detalhes do assistente:', fetchError);
        return false;
      }
      
      // 2. Delete from Vapi API
      try {
        const response = await fetch(`${VAPI_API_URL}/assistant/${assistant.assistant_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('Erro ao deletar assistente na API Vapi:', response.status, response.statusText);
          // Continue with local deletion even if Vapi deletion fails
        } else {
          console.log('Assistente deletado com sucesso na API Vapi');
        }
      } catch (apiError) {
        console.error('Erro na API Vapi ao deletar assistente:', apiError);
        // Continue with local deletion even if Vapi deletion fails
      }
      
      // 3. Delete from local database
      const { error: deleteError } = await supabase
        .from('assistants')
        .delete()
        .eq('id', assistantId);
      
      if (deleteError) {
        console.error('Erro ao deletar assistente no banco de dados:', deleteError);
        return false;
      }
      
      // 4. Check if the deleted assistant was selected in localStorage
      try {
        const selectedAssistant = JSON.parse(localStorage.getItem('selected_assistant') || '{}');
        if (selectedAssistant.id === assistantId) {
          localStorage.removeItem('selected_assistant');
        }
      } catch (error) {
        console.error('Erro ao verificar assistente selecionado:', error);
      }
      
      console.log('Assistente deletado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao deletar assistente:', error);
      return false;
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
      
      // 1. Criar o assistente através do webhook
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
      
      // Gerar um ID único se o webhook retornar apenas uma mensagem de confirmação
      let assistantId;
      if (vapiAssistant.id) {
        assistantId = vapiAssistant.id;
      } else if (vapiAssistant.message && vapiAssistant.message.includes('started')) {
        // O webhook retornou apenas uma mensagem de confirmação, vamos gerar um ID único
        assistantId = uuidv4();
        console.log('Webhook retornou apenas confirmação, gerando ID único:', assistantId);
      } else {
        console.error('Webhook não retornou um ID válido:', vapiAssistant);
        throw new Error('O assistente foi criado, mas não retornou um ID válido');
      }

      // 2. Salvar no banco de dados local
      try {
        const assistantData = {
          name: params.name,
          assistant_id: assistantId, // Usando o ID retornado pela API ou gerado localmente
          system_prompt: params.system_prompt,
          first_message: params.first_message,
          user_id: params.userId,
          status: 'pending' // Marcamos como pending já que o workflow foi iniciado
        };
        
        console.log('Tentando salvar no Supabase:', assistantData);
        
        const { data: savedAssistant, error: dbError } = await supabase
          .from('assistants')
          .insert(assistantData)
          .select()
          .single();

        if (dbError) {
          console.error('Erro ao salvar assistente no banco de dados:', dbError);
          throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
        }

        if (!savedAssistant) {
          console.error('Assistente não foi salvo corretamente');
          throw new Error('Erro ao salvar assistente: Nenhum dado retornado do banco');
        }

        console.log('Assistente salvo no banco de dados com sucesso:', savedAssistant);
        
        // Atualiza o localStorage com o novo assistente
        localStorage.setItem('selected_assistant', JSON.stringify(savedAssistant));
        
        // Notificar sucesso
        toast.success(`Assistente "${params.name}" está sendo criado! Aguarde alguns minutos...`);
        
        return savedAssistant;
      } catch (dbError) {
        console.error('Erro detalhado ao salvar no banco de dados:', dbError);
        throw new Error(`Erro ao salvar no banco: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
      }
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
      const response = await fetch(`https://primary-production-31de.up.railway.app/webhook/collowop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Erro ao disparar webhook de chamada:', response.status, response.statusText);
        return { success: false };
      }

      console.log('Webhook de chamada disparado com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Erro ao disparar webhook de chamada:', error);
      return { success: false };
    }
  },

  /**
   * Fazer uma chamada para um cliente
   */
  async makeCall(clientId: number, phoneNumber: string, campaignId: number): Promise<{ success: boolean, message?: string, data?: any }> {
    try {
      console.log(`Making call to client ${clientId} with phone number ${phoneNumber} for campaign ${campaignId}`);
      
      // Simulate a call or add actual implementation here
      const response = { success: true, message: 'Call initiated successfully', data: { clientId, phoneNumber, campaignId } };
      
      return response;
    } catch (error) {
      console.error('Error making call:', error);
      return { success: false, message: 'Failed to make call', data: null };
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
      voice: assistant.voice
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
