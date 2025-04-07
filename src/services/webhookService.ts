import { supabase, VOICE_SETTINGS } from '@/lib/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import assistantService from './assistantService'; 

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
  published?: boolean;
}

export interface WebhookPayload {
  action: string;
  campaign_id: number;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  user_id?: string;
  additional_data?: Record<string, any>;
  provider?: string;
  call?: {
    model?: string;
    voice?: string;
    language?: string;
  };
}

const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";
const VAPI_API_URL = "https://api.vapi.ai";
const WEBHOOK_BASE_URL = 'https://primary-production-31de.up.railway.app/webhook';
const FETCH_TIMEOUT = 8000; // 8 segundos de timeout para melhor confiabilidade
const CLIENT_VERSION = '1.3.0';
const DEFAULT_MODEL = "eleven_multilingual_v2"; // Modelo atualizado para eleven_multilingual_v2
const DEFAULT_VOICE_NAME = VOICE_SETTINGS.PTBR_FEMALE.name; // Nome da voz em português do Brasil
const DEFAULT_VOICE_ID = VOICE_SETTINGS.PTBR_FEMALE.id; // ID da voz para português do Brasil
const DEFAULT_LANGUAGE = "pt-BR"; // Idioma padrão para chamadas

// Assistente ID fallback - usar apenas em último caso quando não conseguir obter de nenhuma outra fonte
const FALLBACK_VAPI_ASSISTANT_ID = "01646bac-c486-455b-b1f7-1c8e15ba4cbf";

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
   * Busca assistentes diretamente da API Vapi usando a API key 
   * sem filtragem por usuário
   */
  async getAssistantsFromVapiApi(): Promise<any[]> {
    try {
      console.log('Buscando assistentes diretamente da API Vapi');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const response = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch(err => {
        console.warn('Erro de fetch ao buscar assistentes da Vapi:', err);
        return null;
      });
      
      clearTimeout(timeoutId);
      
      if (!response || !response.ok) {
        console.error(`Erro ao buscar assistentes da Vapi: ${response?.status || 'Erro de fetch'}`);
        return [];
      }
      
      const vapiAssistants = await response.json();
      console.log(`Recuperados ${vapiAssistants.length || 0} assistentes diretamente da Vapi:`, vapiAssistants);
      
      // Map the assistants to ensure they have valid status values
      return vapiAssistants.map(assistant => ({
        ...assistant,
        // Make sure status is one of the allowed values in our type system
        status: assistant.status === 'ready' || assistant.status === 'pending' || assistant.status === 'failed' 
          ? assistant.status 
          : 'ready' // Default to 'ready' for any other status values
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar assistentes da Vapi:', error);
      return [];
    }
  },

  async getVapiAssistantById(assistantId: string): Promise<any | null> {
    try {
      console.log(`Buscando assistente diretamente da API Vapi por ID: ${assistantId}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch(err => {
        console.warn('Erro de fetch ao buscar assistente específico da Vapi:', err);
        return null;
      });
      
      clearTimeout(timeoutId);
      
      if (!response || !response.ok) {
        console.error(`Erro ao buscar assistente específico da Vapi: ${response?.status || 'Erro de fetch'}`);
        return null;
      }
      
      const vapiAssistant = await response.json();
      console.log('Assistente específico recuperado da Vapi:', vapiAssistant);
      
      return vapiAssistant;
    } catch (error) {
      console.error('Erro ao buscar assistente específico da Vapi:', error);
      return null;
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
          model: {
            provider: "openai",
            model: "gpt-4o-mini",  // Usando o modelo GPT-4o mini
            temperature: 0.5,
            systemPrompt: params.system_prompt
          },
          voice: {
            provider: "11labs",
            voiceId: DEFAULT_VOICE_ID,  // Usando ID da voz PT-BR
            voiceName: DEFAULT_VOICE_NAME,  // Adicionando nome da voz para referência
            model: "eleven_multilingual_v2"  // Especificando o modelo de voz
          },
          transcriber: {
            provider: "deepgram",
            language: DEFAULT_LANGUAGE,
            model: "nova-2"
          },
          metadata: {
            user_id: params.userId,
            created_at: new Date().toISOString(),
            client_version: CLIENT_VERSION,
            published: true,  // Sinalizar que queremos que o assistente seja publicado
            voice_name: DEFAULT_VOICE_NAME,  // Armazenar o nome da voz nos metadados
            voice_model: "eleven_multilingual_v2"  // Armazenar o modelo de voz nos metadados
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
          created_at: new Date().toISOString(),
          model: DEFAULT_MODEL, // Usando modelo eleven_multilingual_v2 para português
          voice: DEFAULT_VOICE_NAME, // Armazenando o nome da voz ao invés do ID
          voice_id: DEFAULT_VOICE_ID, // Também armazenamos o ID para referência
          published: false // Inicialmente não está publicado
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
        
        // 3. Tentar publicar o assistente explicitamente
        try {
          console.log('Tentando publicar o assistente recém-criado');
          
          // Esperar um pouco para dar tempo ao assistente de ser processado
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          await assistantService.publishAssistant(assistantId, savedAssistant.id);
        } catch (publishError) {
          console.error('Erro ao publicar assistente após criação:', publishError);
          // Continuamos mesmo se falhar a publicação
        }
        
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
  async triggerCallWebhook(payload: WebhookPayload): Promise<{ success: boolean }> {
    try {
      console.log('Disparando webhook com payload inicial:', payload);
      
      // Buscar assistente do localStorage para garantir que temos o ID correto
      let vapiAssistantId = payload.additional_data?.vapi_assistant_id;
      let supabaseAssistantId = payload.additional_data?.assistant_id;
      let assistantNameToUse = payload.additional_data?.assistant_name;
      
      // Voltar ao comportamento anterior: primeiro buscar do localStorage
      try {
        const storedAssistant = localStorage.getItem('selected_assistant');
        if (storedAssistant) {
          const assistant = JSON.parse(storedAssistant);
          if (assistant) {
            // Para Vapi, usamos diretamente o ID ou assistant_id
            vapiAssistantId = assistant.assistant_id || assistant.id;
            supabaseAssistantId = assistant.id;
            assistantNameToUse = assistant.name;
            
            console.log('Using assistant from localStorage:', {
              id: assistant.id,
              assistant_id: assistant.assistant_id,
              name: assistant.name
            });
          }
        }
      } catch (e) {
        console.error('Erro ao obter assistente do localStorage:', e);
      }
      
      // Se ainda não temos o ID, verificar no payload
      if (!vapiAssistantId && payload.additional_data?.assistant_id) {
        vapiAssistantId = payload.additional_data.assistant_id;
        console.log('Usando ID do assistente do payload:', vapiAssistantId);
      }
      
      // Se ainda não temos, usar o ID de fallback
      if (!vapiAssistantId) {
        console.warn('Usando ID de fallback como último recurso:', FALLBACK_VAPI_ASSISTANT_ID);
        vapiAssistantId = FALLBACK_VAPI_ASSISTANT_ID;
        assistantNameToUse = "Assistente Padrão";
      }
      
      if (!vapiAssistantId) {
        console.error('CRÍTICO: Nenhum ID de assistente Vapi disponível para a chamada webhook');
        toast.error('Erro: Nenhum assistente selecionado ou ID inválido. Por favor, crie ou selecione um assistente.');
        return { success: false };
      }
      
      console.log('ID final do assistente para webhook:', vapiAssistantId);
      
      // Garantir que temos um objeto para additional_data
      if (!payload.additional_data) {
        payload.additional_data = {};
      }
      
      // Atualizar os IDs no payload - SIMPLIFICADO para usar diretamente o ID
      payload.additional_data.assistant_id = vapiAssistantId; // Usar diretamente o ID do assistente como antes
      if (assistantNameToUse) {
        payload.additional_data.assistant_name = assistantNameToUse;
      }
      
      // Adicionar provider e configurações da chamada
      payload.provider = "vapi"; // Indicar que estamos usando Vapi como provedor
      
      // Usar sempre os valores atualizados para modelo e voz
      payload.call = {
        model: DEFAULT_MODEL, 
        voice: DEFAULT_VOICE_ID, // Usar o ID da voz diretamente como antes
        language: DEFAULT_LANGUAGE  // Definir idioma português brasileiro explicitamente
      };
      
      // Adicionar informações de debug para ajudar no troubleshooting
      payload.additional_data.timestamp = new Date().toISOString();
      payload.additional_data.client_version = CLIENT_VERSION;
      
      console.log('Enviando payload final para webhook:', payload);
      
      // Usar AbortController para tratamento de timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      try {
        const response = await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
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
      console.error('Erro geral ao disparar webhook de chamada:', error);
      toast.error(`Erro ao realizar chamada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return { success: false };
    }
  },

  /**
   * Métodos auxiliares
   */
  async cacheAssistants(assistants: any[], userId: string): Promise<void> {
    try {
      await Promise.all(
        assistants.map(async (assistant) => {
          // Ensure status is a valid value before storing in database
          const validStatus = assistant.status === 'ready' || 
                              assistant.status === 'pending' || 
                              assistant.status === 'failed' 
                            ? assistant.status 
                            : 'ready';
          
          const { error } = await supabase
            .from('assistants')
            .upsert({
              assistant_id: assistant.id,
              name: assistant.name,
              user_id: userId,
              status: validStatus,
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
    // Ensure status is a valid value before returning
    const validStatus = assistant.status === 'ready' || 
                        assistant.status === 'pending' || 
                        assistant.status === 'failed' 
                      ? assistant.status 
                      : 'ready';
    
    return {
      id: assistant.id,
      name: assistant.name,
      assistant_id: assistant.id,
      user_id: assistant.metadata?.user_id || '',
      status: validStatus,
      created_at: assistant.createdAt,
      system_prompt: assistant.instructions,
      first_message: assistant.firstMessage,
      model: assistant.model,
      voice: assistant.voice,
      published: assistant.metadata?.published || false
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
