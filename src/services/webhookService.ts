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
const FETCH_TIMEOUT = 8000; // 8 segundos de timeout para melhor confiabilidade
const CLIENT_VERSION = '1.3.0';

export const webhookService = {
  /**
   * Busca todos os assistentes de um usuário
   */
  async getAllAssistants(userId: string): Promise<VapiAssistant[]> {
    try {
      console.log(`Buscando assistentes para o usuário ${userId}`);

      // 1. Busca assistentes no banco de dados local primeiro
      const localAssistants = await this.getLocalAssistants(userId);
      console.log(`Encontrados ${localAssistants.length} assistentes locais`);
      
      // 2. Busca na API do VAPI - com tratamento de CORS e timeout
      try {
        console.log('Tentando buscar assistentes da API VAPI...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch(`${VAPI_API_URL}/assistant`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          mode: 'cors',
        }).catch(err => {
          console.warn('Erro de fetch ao buscar assistentes:', err);
          return null;
        });
        
        clearTimeout(timeoutId);
        
        // Se o fetch falhou ou não retornou OK
        if (!response || !response.ok) {
          console.warn(`Não foi possível buscar assistentes da API: ${response?.status || 'Erro de fetch'}`);
          // Log de informações mais detalhadas sobre o erro para depuração
          if (response) {
            console.warn(`Status: ${response.status}, StatusText: ${response.statusText}`);
            try {
              const errorText = await response.text();
              console.warn('Resposta de erro:', errorText);
            } catch (e) {
              console.warn('Não foi possível extrair texto de erro da resposta');
            }
          }
          return localAssistants; // Retorna apenas assistentes locais em caso de erro
        }

        const vapiAssistants = await response.json();
        console.log('Assistentes recuperados da VAPI:', vapiAssistants.length || 0);
        
        // Filtra assistentes pelo user_id do metadata
        const userAssistants = vapiAssistants.filter((assistant: any) => {
          if (assistant?.metadata?.user_id) {
            return assistant.metadata.user_id === userId;
          }
          return false;
        });
        
        console.log(`Filtrados ${userAssistants.length} assistentes para o usuário ${userId}`);

        // Combina e remove duplicatas
        const combined = this.combineAssistants(localAssistants, userAssistants);
        
        // Atualiza cache
        if (userAssistants.length > 0) {
          await this.cacheAssistants(userAssistants, userId);
        }
        
        return combined;
      } catch (apiError) {
        console.error('Erro na API VAPI:', apiError);
        return localAssistants; // Em caso de erro, retorna apenas assistentes locais
      }
      
    } catch (error) {
      console.error('Erro ao buscar assistentes:', error);
      return []; // Retorna array vazio em caso de erro geral
    }
  },

  /**
   * Deleta um assistente pelo ID
   */
  async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      console.log(`Deletando assistente ${assistantId}`);
      
      // 1. Busca detalhes do assistente para encontrar o assistant_id do Vapi
      const { data: assistant, error: fetchError } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
      
      if (fetchError || !assistant) {
        console.error('Erro ao buscar detalhes do assistente:', fetchError);
        return false;
      }
      
      // 2. Deleta da API Vapi
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        const response = await fetch(`${VAPI_API_URL}/assistant/${assistant.assistant_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('Erro ao deletar assistente na API Vapi:', response.status, response.statusText);
          // Continua com a deleção local mesmo se falhar na Vapi
        } else {
          console.log('Assistente deletado com sucesso na API Vapi');
        }
      } catch (apiError) {
        console.error('Erro na API Vapi ao deletar assistente:', apiError);
        // Continua com a deleção local mesmo se falhar na Vapi
      }
      
      // 3. Deleta do banco de dados local
      const { error: deleteError } = await supabase
        .from('assistants')
        .delete()
        .eq('id', assistantId);
      
      if (deleteError) {
        console.error('Erro ao deletar assistente no banco de dados:', deleteError);
        return false;
      }
      
      // 4. Verifica se o assistente deletado estava selecionado no localStorage
      try {
        const selectedAssistant = JSON.parse(localStorage.getItem('selected_assistant') || '{}');
        if (selectedAssistant.id === assistantId) {
          localStorage.removeItem('selected_assistant');
        }
      } catch (error) {
        console.error('Erro ao verificar assistente selecionado:', error);
      }
      
      console.log('Assistente deletado com sucesso');
      toast.success('Assistente deletado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao deletar assistente:', error);
      toast.error(`Erro ao deletar assistente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

      console.log(`Encontrados ${data?.length || 0} assistentes locais para o usuário ${userId}`);
      
      // Garantir que sempre temos um status definido para cada assistente
      return (data || []).map(assistant => ({
        ...assistant,
        status: assistant.status || 'ready'
      }));
    } catch (error) {
      console.error('Erro ao buscar assistentes locais:', error);
      return [];
    }
  },

  /**
   * Cria um novo assistente para o usuário
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const response = await fetch(`${WEBHOOK_BASE_URL}/createassistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: params.name,
          firstMessage: params.first_message,
          instructions: params.system_prompt,
          metadata: {
            user_id: params.userId,
            created_at: new Date().toISOString(),
            client_version: CLIENT_VERSION
          }
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

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
          status: 'pending', // Marcamos como pending já que o workflow foi iniciado
          created_at: new Date().toISOString()
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
   * Dispara um webhook para iniciar uma chamada
   */
  async triggerCallWebhook(payload: WebhookPayload): Promise<{ success: boolean }> {
    try {
      console.log('Disparando webhook com payload:', payload);
      
      // Buscar assistente do localStorage para garantir que temos o ID correto
      let assistantIdToUse = payload.additional_data?.assistant_id;
      let assistantNameToUse = payload.additional_data?.assistant_name;
      
      if (!assistantIdToUse) {
        try {
          const storedAssistant = localStorage.getItem('selected_assistant');
          if (storedAssistant) {
            const assistant = JSON.parse(storedAssistant);
            if (assistant) {
              // Priorizar assistant_id sobre id caso ambos estejam presentes
              assistantIdToUse = assistant.assistant_id || assistant.id;
              assistantNameToUse = assistant.name;
              
              // Atualizar no payload
              if (!payload.additional_data) {
                payload.additional_data = {};
              }
              payload.additional_data.assistant_id = assistantIdToUse;
              payload.additional_data.assistant_name = assistantNameToUse;
              
              console.log('Using assistant ID from localStorage:', assistantIdToUse);
              console.log('Using assistant name from localStorage:', assistantNameToUse);
            }
          }
        } catch (e) {
          console.error('Erro ao obter ID do assistente do localStorage:', e);
        }
      }
      
      if (!assistantIdToUse) {
        console.warn('Nenhum ID de assistente disponível para a chamada webhook, tentando buscar o primeiro disponível');
        try {
          // Busca o primeiro assistente disponível como fallback
          const userId = payload.user_id;
          if (userId) {
            const assistants = await this.getLocalAssistants(userId);
            if (assistants && assistants.length > 0) {
              const firstAssistant = assistants[0];
              assistantIdToUse = firstAssistant.assistant_id || firstAssistant.id;
              assistantNameToUse = firstAssistant.name;
              
              if (!payload.additional_data) {
                payload.additional_data = {};
              }
              payload.additional_data.assistant_id = assistantIdToUse;
              payload.additional_data.assistant_name = assistantNameToUse;
              
              console.log('Using first available assistant as fallback:', {
                id: assistantIdToUse,
                name: assistantNameToUse
              });
            }
          }
        } catch (e) {
          console.error('Erro ao buscar assistente de fallback:', e);
        }
      }
      
      if (!assistantIdToUse) {
        console.error('CRÍTICO: Nenhum ID de assistente disponível para a chamada webhook');
        toast.error('Erro: Nenhum assistente selecionado. Por favor, crie ou selecione um assistente.');
        return { success: false };
      }
      
      // Garantir que temos um objeto para additional_data
      if (!payload.additional_data) {
        payload.additional_data = {};
      }
      
      // Adicionar informações de debug para ajudar no troubleshooting
      payload.additional_data.source_url = window.location.href;
      payload.additional_data.timestamp = new Date().toISOString();
      payload.additional_data.client_version = CLIENT_VERSION;
      
      console.log('Enviando payload final para webhook:', payload);
      
      // Usar AbortController para tratamento de timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      try {
        const response = await fetch(`${WEBHOOK_BASE_URL}/collowop`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro ao disparar webhook de chamada:', response.status, response.statusText, errorText);
          toast.error(`Erro ao realizar chamada (${response.status}): ${response.statusText}`);
          return { success: false };
        }

        console.log('Webhook de chamada disparado com sucesso');
        toast.success('Chamada iniciada com sucesso');
        return { success: true };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Verifica se é um erro de abort (timeout)
        if (fetchError.name === 'AbortError') {
          console.error('Timeout ao disparar webhook de chamada');
          toast.error('Tempo esgotado ao tentar conectar ao servidor. Verifique sua conexão.');
        } else {
          console.error('Erro ao disparar webhook de chamada:', fetchError);
          toast.error(`Erro ao realizar chamada: ${fetchError.message || 'Falha na conexão'}`);
        }
        
        return { success: false };
      }
    } catch (error) {
      console.error('Erro geral ao disparar webhook de chamada:', error);
      toast.error(`Erro ao realizar chamada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return { success: false };
    }
  },

  /**
   * Fazer uma chamada para um cliente
   */
  async makeCall(clientId: number, phoneNumber: string, campaignId: number): Promise<{ success: boolean, message?: string, data?: any }> {
    try {
      console.log(`Iniciando chamada para cliente ${clientId} com número ${phoneNumber} na campanha ${campaignId}`);
      
      // Obtém o assistente atual do localStorage
      let assistant = null;
      try {
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          assistant = JSON.parse(storedAssistant);
        }
      } catch (e) {
        console.error('Erro ao obter assistente do localStorage:', e);
      }
      
      // Prepara o payload para o webhook
      const payload: WebhookPayload = {
        action: 'initiate_call',
        campaign_id: campaignId,
        client_id: clientId,
        client_phone: phoneNumber,
        additional_data: {
          timestamp: new Date().toISOString(),
          client_version: CLIENT_VERSION,
          source: 'manual_call'
        }
      };
      
      // Adiciona informações do assistente se disponíveis
      if (assistant) {
        payload.additional_data!.assistant_id = assistant.assistant_id || assistant.id;
        payload.additional_data!.assistant_name = assistant.name;
      }
      
      // Envia para o webhook
      const result = await this.triggerCallWebhook(payload);
      
      if (result.success) {
        return { success: true, message: 'Chamada iniciada com sucesso', data: { clientId, phoneNumber, campaignId } };
      } else {
        return { success: false, message: 'Falha ao iniciar chamada', data: null };
      }
    } catch (error) {
      console.error('Erro ao realizar chamada:', error);
      return { success: false, message: 'Falha ao iniciar chamada', data: null };
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
              model: assistant.model,
              voice: assistant.voice
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
      const existingIndex = combined.findIndex(a => a.assistant_id === remoteAssistant.assistant_id);
      
      if (existingIndex === -1) {
        // Adiciona assistente remoto que não existe localmente
        combined.push(remoteAssistant);
      } else {
        // Atualiza o status do assistente local se o remoto tiver status diferente
        if (remoteAssistant.status !== combined[existingIndex].status) {
          combined[existingIndex].status = remoteAssistant.status;
        }
      }
    });

    console.log(`Combinados ${combined.length} assistentes (${local.length} locais + ${remoteMapped.length} remotos)`);
    return combined;
  },
};

export default webhookService;