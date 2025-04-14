import { supabase, VOICE_SETTINGS } from '@/lib/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import assistantService from './assistantService';

export interface WebhookPayload {
  action: string;
  campaign_id?: number;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  account_id?: string;
  provider?: string;
  call?: {
    model?: string | {
      model?: string;
      provider?: string;
      temperature?: number;
      systemPrompt?: string;
    };
    voice?: string | {
      model?: string;
      voiceId?: string;
      provider?: string;
      voiceName?: string;
    };
    language?: string;
    first_message?: string;
    system_prompt?: string;
  };
  additional_data?: {
    source?: string;
    user_interface?: string;
    assistant_name?: string;
    assistant_id?: string | null;
    vapi_assistant_id?: string;
    caller_id?: string;
    api_key?: string;
    timestamp?: string;
    client_version?: string;
    account_id?: string;
    first_message?: string;
    system_prompt?: string;
    [key: string]: any;
  };
  [key: string]: any;
}


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
  metadata?: {
    user_id?: string;
    [key: string]: any;
  };
}


const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";
const VAPI_API_URL = "https://api.vapi.ai";
const WEBHOOK_BASE_URL = 'https://primary-production-31de.up.railway.app/webhook';
const WEBHOOK_COLLOWOP_URL = 'https://primary-production-31de.up.railway.app/webhook/collowop';
const FETCH_TIMEOUT = 8000; // 8 segundos de timeout para melhor confiabilidade
const CLIENT_VERSION = '1.3.0';
const DEFAULT_MODEL = "eleven_multilingual_v2"; // Modelo atualizado para eleven_multilingual_v2
const DEFAULT_VOICE_NAME = VOICE_SETTINGS.PTBR_FEMALE.name; // Nome da voz em português do Brasil
const DEFAULT_VOICE_ID = VOICE_SETTINGS.PTBR_FEMALE.id; // ID da voz para português do Brasil
const DEFAULT_LANGUAGE = "pt-BR"; // Idioma padrão para chamadas
const DEFAULT_CALLER_ID = "97141b30-c5bc-4234-babb-d38b79452e2a"; // Default caller ID

// Assistente ID fallback - usar apenas em último caso quando não conseguir obter de nenhuma outra fonte
const FALLBACK_VAPI_ASSISTANT_ID = "01646bac-c486-455b-b1f7-1c8e15ba4cbf";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  replaceTemplateVariables(message: string, clientData: any): string {
    if (!message) {
      console.warn('Warning: Empty message provided to replaceTemplateVariables', {
        message,
        clientData: clientData ? { 
          client_name: clientData.client_name,
          campaign_id: clientData.campaign_id
        } : 'No client data'
      });
      return message || '';
    }
    
    try {
      console.log('Substituindo variáveis de template na mensagem:', { 
        originalMessage: message, 
        clientData: clientData ? {
          client_name: clientData.client_name,
          campaign_id: clientData.campaign_id
        } : 'Dados do cliente não disponíveis'
      });
      
      // Replace {nome} with client_name if available
      if (clientData && clientData.client_name) {
        message = message.replace(/\{nome\}/gi, clientData.client_name);
        console.log(`Substituiu {nome} por "${clientData.client_name}"`);
      } else {
        console.log('Nome do cliente não disponível para substituição, removendo {nome}');
        message = message.replace(/\{nome\}/gi, '');
      }
      
      // Adicional: substitui {campaign} pelo ID da campanha se disponível
      if (clientData && clientData.campaign_id) {
        message = message.replace(/\{campaign\}/gi, clientData.campaign_id.toString());
        console.log(`Substituiu {campaign} por "${clientData.campaign_id}"`);
      }
      
      console.log('Mensagem final após substituições:', message);
      return message;
    } catch (error) {
      console.error('Erro ao substituir variáveis de template:', error);
      // Retorna a mensagem original em caso de erro
      return message || '';
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
      console.log(`Recuperados ${vapiAssistants.length || 0} assistentes diretamente da Vapi`);
      
      // Enhanced logging for debugging
      vapiAssistants.forEach(assistant => {
        console.log(`Assistente: ${assistant.name}, ID: ${assistant.id}, metadata:`, assistant.metadata);
      });
      
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
        
        // 3. Tentar publicar o assistente explicitamente através do webhook
        try {
          console.log('Tentando publicar o assistente recém-criado');
          
          // Esperar um pouco para dar tempo ao assistente de ser processado
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Enviar solicitação para publicar o assistente
          await fetch(`${WEBHOOK_BASE_URL}/publishassistant`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assistant_id: assistantId,
              supabase_id: savedAssistant.id,
              publish: true
            }),
          });
          
          console.log(`Solicitação de publicação enviada para o assistente ${assistantId}`);
          
          // Atualizar o status no banco de dados
          await supabase
            .from('assistants')
            .update({ published: true })
            .eq('id', savedAssistant.id);
            
          console.log('Status de publicação atualizado no banco de dados');
          
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


  async getClientsByAccount(accountId: string) {
    try {
      console.log(`Buscando clientes para a conta ${accountId}`);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('account_id', accountId);
        
      if (error) {
        console.error('Erro ao buscar clientes por conta:', error);
        throw error;
      }
      
      console.log(`Encontrados ${data?.length || 0} clientes para a conta ${accountId}`);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar clientes por conta:', error);
      toast.error(`Erro ao buscar clientes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return [];
    }
  },

  async sendFirstMessageToWebhook(assistantId?: string): Promise<{success: boolean, message?: string}> {
    try {
      console.log('Enviando first message para o webhook collowop, assistantId:', assistantId);
      
      // Variables to store assistant information
      let selectedAssistant = null;
      let firstMessage = "";
      let systemPrompt = "";
      let assistantName = "Assistente";
      
      // Try to get assistant details directly from Supabase
      if (assistantId) {
        try {
          console.log(`Looking for assistant with ID ${assistantId} in Supabase...`);
          // First, get assistant details from Supabase by assistant_id
          const { data: assistantByVapiId, error: vapiIdError } = await supabase
            .from('assistants')
            .select('*')
            .eq('assistant_id', assistantId)
            .single();
            
          if (vapiIdError) {
            console.log('Assistant not found by assistant_id, trying with id field...');
            // Try finding by the id field if not found by assistant_id
            const { data: assistantById, error: idError } = await supabase
              .from('assistants')
              .select('*')
              .eq('id', assistantId)
              .single();
              
            if (idError) {
              console.error('Error fetching assistant from Supabase by both IDs:', {vapiIdError, idError});
            } else if (assistantById) {
              console.log('Assistant found in Supabase by id field:', assistantById);
              selectedAssistant = assistantById;
            }
          } else if (assistantByVapiId) {
            console.log('Assistant found in Supabase by assistant_id:', assistantByVapiId);
            selectedAssistant = assistantByVapiId;
          }
          
          if (selectedAssistant) {
            assistantName = selectedAssistant.name || "Assistente";
            // Ensure we're getting the first_message, with detailed logging
            if (selectedAssistant.first_message) {
              firstMessage = selectedAssistant.first_message;
              console.log(`Found first_message in Supabase: "${firstMessage}"`);
            } else {
              console.warn('No first_message found in the assistant record:', selectedAssistant);
              // Setting a default if none found
              firstMessage = "Olá {nome}, como posso ajudar?";
            }
            systemPrompt = selectedAssistant.system_prompt || "";
          } else {
            console.log('Assistant not found in Supabase, trying Vapi API');
            // If not found in Supabase, try Vapi API as fallback
            selectedAssistant = await this.getVapiAssistantById(assistantId);
            
            if (selectedAssistant) {
              assistantName = selectedAssistant.name || assistantName;
              firstMessage = selectedAssistant.first_message || "Olá {nome}, como posso ajudar?";
              systemPrompt = selectedAssistant.system_prompt || systemPrompt;
              console.log('Assistant found in Vapi API:', {
                name: assistantName,
                first_message: firstMessage
              });
            }
          }
        } catch (error) {
          console.error('Error fetching assistant details:', error);
          // Set default first message as fallback
          firstMessage = "Olá {nome}, como posso ajudar?";
        }
      }
      
      // If no assistant found by ID, try to get from Supabase
      if (!selectedAssistant) {
        try {
          console.log('Trying to get any assistant from Supabase');
          const { data: assistants, error } = await supabase
            .from('assistants')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) {
            console.error('Error fetching assistants from Supabase:', error);
          }
          
          if (assistants && assistants.length > 0) {
            selectedAssistant = assistants[0];
            assistantName = selectedAssistant.name || assistantName;
            
            if (selectedAssistant.first_message) {
              firstMessage = selectedAssistant.first_message;
              console.log(`Found first_message from assistant in Supabase: "${firstMessage}"`);
            } else {
              console.warn('No first_message found in the latest assistant record');
              firstMessage = "Olá {nome}, como posso ajudar?";
            }
            
            systemPrompt = selectedAssistant.system_prompt || systemPrompt;
            console.log('Found assistant in Supabase:', {
              name: assistantName,
              first_message: firstMessage
            });
          } else {
            console.warn('No assistants found in Supabase, using default first_message');
            firstMessage = "Olá {nome}, como posso ajudar?";
          }
        } catch (error) {
          console.error('Error fetching assistants from Supabase:', error);
          firstMessage = "Olá {nome}, como posso ajudar?";
        }
      }
      
      // Log the first message we're going to use
      console.log('Using first message for webhook:', firstMessage || "EMPTY - THIS IS AN ERROR");
      
      if (!firstMessage) {
        console.error('WARNING: first_message is empty, using default fallback message');
        firstMessage = "Olá {nome}, como posso ajudar?";
      }
      
      // Get configuration from localStorage
      let model = DEFAULT_MODEL;
      let voice = DEFAULT_VOICE_ID;
      let language = DEFAULT_LANGUAGE;
      let apiKey = VAPI_API_KEY;
      let callerId = DEFAULT_CALLER_ID;
      
      try {
        const savedSettings = localStorage.getItem('vapi_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.model) model = settings.model;
          if (settings.voice) voice = settings.voice;
          if (settings.language) language = settings.language || DEFAULT_LANGUAGE;
          if (settings.apiKey) apiKey = settings.apiKey;
          if (settings.callerId) callerId = settings.callerId;
          console.log('Using settings from localStorage');
        }
      } catch (e) {
        console.error('Error getting settings:', e);
      }
      
      // Prepare payload for webhook
      const payload = {
        action: 'send_first_message',
        client_name: "Cliente Exemplo",
        client_phone: "+5511999999999",
        provider: "vapi",
        call: {
          model: {
            provider: "openai",
            model: model,
            temperature: 0.5,
            systemPrompt: systemPrompt
          },
          voice: {
            provider: "11labs",
            model: DEFAULT_MODEL,
            voiceId: voice
          },
          language: language,
          first_message: firstMessage,
          system_prompt: systemPrompt
        },
        additional_data: {
          source: 'first_message_sync',
          user_interface: 'webhookService',
          assistant_name: assistantName,
          caller_id: callerId,
          api_key: apiKey,
          assistant_id: null,
          vapi_assistant_id: assistantId || (selectedAssistant?.assistant_id || selectedAssistant?.id),
          timestamp: new Date().toISOString(),
          client_version: CLIENT_VERSION
        }
      };
      
      console.log('Payload prepared for webhook (sensitive info redacted):', {
        ...payload,
        call: {
          ...payload.call,
          first_message: payload.call.first_message,
          system_prompt: payload.call.system_prompt ? '***' : 'vazio'
        },
        additional_data: {
          ...payload.additional_data,
          api_key: '***REDACTED***'
        }
      });
      
      // Send to webhook
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      try {
        const response = await fetch(WEBHOOK_COLLOWOP_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Caller-Id': callerId
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error sending first message to webhook:', response.status, response.statusText, errorText);
          return { 
            success: false, 
            message: `Error sending message: ${response.status} - ${response.statusText}` 
          };
        }
        
        console.log('First message sent successfully to webhook');
        return { 
          success: true, 
          message: 'First message sent successfully to webhook' 
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('Timeout sending first message to webhook');
          return { 
            success: false, 
            message: 'Timeout trying to send the message' 
          };
        } else {
          console.error('Error sending first message to webhook:', fetchError);
          return { 
            success: false, 
            message: `Connection error: ${fetchError.message || 'Connection failed'}` 
          };
        }
      }
    } catch (error) {
      console.error('General error sending first message to webhook:', error);
      return { 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  },

  async triggerCallWebhook(payload: { 
    action: string; 
    account_id?: string;
    clients?: Array<{phone: string, name: string, id?: number}>;  // Novo campo para array de clientes
    additional_data?: Record<string, any>; 
    [key: string]: any; 
  }): Promise<{ success: boolean }> {
    try {
      console.log('Disparando webhook com payload inicial:', payload);
      
      // Adicionar account_id ao payload se fornecido
      if (payload.account_id) {
        if (!payload.additional_data) {
          payload.additional_data = {};
        }
        payload.additional_data.account_id = payload.account_id;
        console.log(`Filtrando chamadas para conta: ${payload.account_id}`);
      }
      
      // Obtém assistentes diretamente da API da Vapi
      const vapiAssistants = await this.getAssistantsFromVapiApi();
      console.log('Assistentes obtidos diretamente da Vapi API:', vapiAssistants.length);
      
      // Escolher o assistente apropriado
      let selectedAssistant = null;
      let assistantId: string | null = null;
      let firstMessage: string = payload.call?.first_message || '';
      let systemPrompt: string = payload.call?.system_prompt || '';
      
      // 1. Tentar por ID no payload se disponível
      if (payload.additional_data?.vapi_assistant_id && 
          UUID_REGEX.test(payload.additional_data.vapi_assistant_id)) {
        // Verificar se este ID existe na lista de assistentes da Vapi
        selectedAssistant = vapiAssistants.find(a => a.id === payload.additional_data?.vapi_assistant_id);
        if (selectedAssistant) {
          assistantId = selectedAssistant.id;
          // Obter first_message e system_prompt do assistente selecionado
          firstMessage = selectedAssistant.first_message || firstMessage;
          systemPrompt = selectedAssistant.system_prompt || systemPrompt;
          console.log('ID do assistente no payload validado na Vapi API:', assistantId, {
            firstMessage,
            systemPrompt
          });
        } else {
          console.log('ID do assistente no payload não encontrado na Vapi API, buscando alternativas');
        }
      }
      
      // 2. Tentar por nome no payload
      if (!assistantId && payload.additional_data?.assistant_name) {
        const assistantName = payload.additional_data.assistant_name;
        // Procurar por correspondência exata ou parcial do nome
        selectedAssistant = vapiAssistants.find(a => 
          a.name.toLowerCase() === assistantName.toLowerCase() ||
          a.name.toLowerCase().includes(assistantName.toLowerCase()) ||
          assistantName.toLowerCase().includes(a.name.toLowerCase())
        );
        
        if (selectedAssistant) {
          assistantId = selectedAssistant.id;
          // Obter first_message e system_prompt do assistente selecionado
          firstMessage = selectedAssistant.first_message || firstMessage;
          systemPrompt = selectedAssistant.system_prompt || systemPrompt;
          console.log(`Assistente encontrado por nome "${assistantName}":`, assistantId, {
            firstMessage,
            systemPrompt
          });
        }
      }
      
      // 3. Tentar obter do localStorage
      if (!assistantId) {
        try {
          const storedAssistant = localStorage.getItem('selected_assistant');
          if (storedAssistant) {
            const assistant = JSON.parse(storedAssistant);
            if (assistant) {
              // Tentar validar o ID contra a Vapi API
              if (assistant.assistant_id) {
                selectedAssistant = vapiAssistants.find(a => a.id === assistant.assistant_id);
                if (selectedAssistant) {
                  assistantId = selectedAssistant.id;
                  // Obter first_message e system_prompt do assistente selecionado
                  firstMessage = selectedAssistant.first_message || firstMessage || assistant.first_message || '';
                  systemPrompt = selectedAssistant.system_prompt || systemPrompt || assistant.system_prompt || '';
                  console.log('ID do assistente do localStorage validado na Vapi API:', assistantId, {
                    firstMessage,
                    systemPrompt
                  });
                }
              }
              
              // Se ainda não encontrou, tentar pelo nome
              if (!assistantId && assistant.name) {
                selectedAssistant = vapiAssistants.find(a => 
                  a.name.toLowerCase() === assistant.name.toLowerCase() ||
                  a.name.toLowerCase().includes(assistant.name.toLowerCase()) ||
                  assistant.name.toLowerCase().includes(a.name.toLowerCase())
                );
                
                if (selectedAssistant) {
                  assistantId = selectedAssistant.id;
                  // Obter first_message e system_prompt do assistente selecionado
                  firstMessage = selectedAssistant.first_message || firstMessage || assistant.first_message || '';
                  systemPrompt = selectedAssistant.system_prompt || systemPrompt || assistant.system_prompt || '';
                  console.log(`Assistente encontrado por nome do localStorage "${assistant.name}":`, assistantId, {
                    firstMessage,
                    systemPrompt
                  });
                }
              }
              
              // Se ainda não temos first_message ou system_prompt, usar do localStorage
              if (!firstMessage && assistant.first_message) {
                firstMessage = assistant.first_message;
              }
              if (!systemPrompt && assistant.system_prompt) {
                systemPrompt = assistant.system_prompt;
              }
            }
          }
        } catch (e) {
          console.error('Erro ao processar assistente do localStorage:', e);
        }
      }
      
      // 4. Se ainda não temos um assistente, pegar o primeiro da lista
      if (!assistantId && vapiAssistants.length > 0) {
        selectedAssistant = vapiAssistants[0];
        assistantId = selectedAssistant.id;
        // Obter first_message e system_prompt do assistente selecionado
        firstMessage = selectedAssistant.first_message || firstMessage;
        systemPrompt = selectedAssistant.system_prompt || systemPrompt;
        console.log('Usando o primeiro assistente disponível na Vapi API:', assistantId, {
          firstMessage,
          systemPrompt
        });
      }
      
      // 5. Se ainda assim não temos um ID, usar o fallback
      if (!assistantId) {
        // Tentar validar o fallback primeiro
        selectedAssistant = vapiAssistants.find(a => a.id === FALLBACK_VAPI_ASSISTANT_ID);
        if (selectedAssistant) {
          assistantId = FALLBACK_VAPI_ASSISTANT_ID;
          // Obter first_message e system_prompt do assistente selecionado
          firstMessage = selectedAssistant.first_message || firstMessage;
          systemPrompt = selectedAssistant.system_prompt || systemPrompt;
          console.log('Usando ID de fallback validado na Vapi API:', assistantId, {
            firstMessage,
            systemPrompt
          });
        } else {
          // Se mesmo o fallback não for válido, não temos opção
          console.error('Nenhum assistente válido encontrado na Vapi API, incluindo o fallback');
          toast.error('Erro: Não foi possível encontrar um assistente válido. Por favor, crie um novo assistente.');
          return { success: false };
        }
      }
      
      if (!payload.additional_data) {
        payload.additional_data = {};
      }
      
      // Atualizar os dados do assistente no payload
      payload.additional_data.vapi_assistant_id = assistantId;
      if (selectedAssistant) {
        payload.additional_data.assistant_name = selectedAssistant.name;
        // Incluir outros detalhes úteis
        payload.additional_data.assistant_created_at = selectedAssistant.created_at;
        payload.additional_data.assistant_status = selectedAssistant.status;
      }
      
      // Definir provider como "vapi"
      payload.provider = "vapi";
  
      // Se temos uma lista de clientes no payload, aplicar as variáveis de template ao first_message
      // para o primeiro cliente na lista apenas para propósitos de log
      if (payload.clients && payload.clients.length > 0 && firstMessage) {
        const sampleClient = payload.clients[0];
        const sampleFirstMessage = this.replaceTemplateVariables(firstMessage, {
          client_name: sampleClient.name
        });
        console.log('First message after variable replacement (sample):', sampleFirstMessage);
      } else if (firstMessage) {
        firstMessage = this.replaceTemplateVariables(firstMessage, payload);
        console.log('First message after variable replacement:', firstMessage);
      }
      
      // Obter configurações de modelo e voz
      let model = DEFAULT_MODEL;
      let voice = DEFAULT_VOICE_ID;
      let apiKey = VAPI_API_KEY;
      let callerId = DEFAULT_CALLER_ID;
      
      try {
        // Verificar se temos configurações salvas
        const savedSettings = localStorage.getItem('vapi_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.model) model = settings.model;
          if (settings.voice) voice = settings.voice;
          if (settings.apiKey) apiKey = settings.apiKey;
          if (settings.callerId) callerId = settings.callerId;
          console.log('Usando configurações da localStorage:', { model, voice, apiKey: apiKey ? "***" : "não definida", callerId });
        }
        
        // Se o assistente selecionado tem configurações próprias, usar elas
        if (selectedAssistant) {
          if (selectedAssistant.model) model = selectedAssistant.model;
          if (selectedAssistant.voice) voice = selectedAssistant.voice;
          console.log('Usando configurações do assistente selecionado:', { model, voice });
        }
        
        // Prioritize caller_id and api_key from payload if available
        if (payload.additional_data?.caller_id) {
          callerId = payload.additional_data.caller_id;
          console.log('Usando callerId do payload:', callerId);
        }
        
        if (payload.additional_data?.api_key) {
          apiKey = payload.additional_data.api_key;
          console.log('Usando apiKey do payload');
        }
      } catch (e) {
        console.error('Erro ao obter configurações:', e);
      }
      
      // Definir configurações da chamada com os valores corretos de first_message e system_prompt
      if (typeof payload.call === 'object') {
        const modelConfig = typeof payload.call.model === 'string' ? 
          { 
            provider: "openai", 
            model: payload.call.model || model, 
            temperature: 0.5,
            systemPrompt: systemPrompt 
          } : 
          {
            ...(typeof payload.call.model === 'object' ? payload.call.model : {}),
            provider: "openai",
            model: (typeof payload.call.model === 'object' && payload.call.model?.model) || model,
            temperature: (typeof payload.call.model === 'object' && payload.call.model?.temperature) || 0.5,
            systemPrompt: systemPrompt
          };
  
        const voiceConfig = typeof payload.call.voice === 'string' ?
          {
            provider: "11labs",
            voiceId: payload.call.voice || voice,
            model: DEFAULT_MODEL
          } :
          {
            ...(typeof payload.call.voice === 'object' ? payload.call.voice : {}),
            provider: "11labs",
            voiceId: (typeof payload.call.voice === 'object' && payload.call.voice?.voiceId) || voice,
            model: (typeof payload.call.voice === 'object' && payload.call.voice?.model) || DEFAULT_MODEL
          };
  
          payload.call = {
            model: modelConfig,
            voice: voiceConfig,
            language: payload.call.language || DEFAULT_LANGUAGE,
            first_message: firstMessage,  // Garantir que first_message seja definido
            system_prompt: systemPrompt   // Garantir que system_prompt seja definido
          };
      } else {
        // Se não existe um objeto call, criar um
        payload.call = {
          model: {
            provider: "openai",
            model: model,
            temperature: 0.5,
            systemPrompt: systemPrompt
          },
          voice: {
            provider: "11labs",
            voiceId: voice,
            model: DEFAULT_MODEL
          },
          language: DEFAULT_LANGUAGE,
          first_message: firstMessage,
          system_prompt: systemPrompt
        };
      }
      
      // Adicionar informações de autenticação
      payload.additional_data.caller_id = callerId;
      payload.additional_data.api_key = apiKey;
      
      // Adicionar informações de prompt para additional_data também
      payload.additional_data.first_message = firstMessage;
      payload.additional_data.system_prompt = systemPrompt;
      
      // Adicionar informações de debug
      payload.additional_data.timestamp = new Date().toISOString();
      payload.additional_data.client_version = CLIENT_VERSION;
      payload.additional_data.id_source = 'vapi_api_direct';
      
      console.log('Enviando payload final para webhook:', {
        ...payload,
        clients: payload.clients ? `Array com ${payload.clients.length} cliente(s)` : undefined,
        additional_data: {
          ...payload.additional_data,
          api_key: '***REDACTED***' // Don't log the actual API key
        }
      });
      
      // Usar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      try {
        const response = await fetch(WEBHOOK_COLLOWOP_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Caller-Id': callerId // Add caller ID to headers
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
  async makeCall(clientId: number, phoneNumber: string, campaignId: number, accountId?: string): Promise<{ success: boolean, message?: string, data?: any }> {
    try {
      console.log(`Iniciando chamada para cliente ${clientId} com número ${phoneNumber} na campanha ${campaignId}${accountId ? `, conta ${accountId}` : ''}`);
      
      // Obtém informações do cliente para personalização da mensagem
      let clientName = "";
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('name')
          .eq('id', clientId)
          .single();
          
        if (!clientError && clientData) {
          clientName = clientData.name;
          console.log(`Cliente encontrado: ${clientName}`);
        } else {
          console.warn(`Cliente não encontrado no banco de dados: ${clientId}`);
        }
      } catch (e) {
        console.error('Erro ao buscar informações do cliente:', e);
      }
      
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
      
      // Prepara o payload para o webhook com cliente como um array
      const payload: {
        action: string;
        campaign_id: number;
        clients: Array<{id: number, phone: string, name: string}>;  // Novo formato de array
        account_id?: string;
        additional_data?: {
          timestamp: string;
          client_version: string;
          source: string;
          assistant_id?: string;
          assistant_name?: string;
        };
      } = {
        action: 'initiate_call',
        campaign_id: campaignId,
        clients: [{  // Cliente como objeto em um array
          id: clientId,
          phone: phoneNumber,
          name: clientName || "Cliente"  // Usar "Cliente" como fallback se não tiver nome
        }],
        account_id: accountId, // Incluir account_id se fornecido
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
        return { success: true, message: 'Chamada iniciada com sucesso', data: { clientId, phoneNumber, campaignId, accountId } };
      } else {
        return { success: false, message: 'Falha ao iniciar chamada', data: null };
      }
    } catch (error) {
      console.error('Erro geral ao disparar webhook de chamada:', error);
      toast.error(`Erro ao realizar chamada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return { success: false };
    }
  },
  
  // Adicionando função para realizar chamadas em massa
  async makeBulkCalls(clients: Array<{id: number, phone: string, name: string}>, campaignId: number, accountId?: string): Promise<{ success: boolean, message?: string, data?: any }> {
    try {
      console.log(`Iniciando chamadas em massa para ${clients.length} clientes na campanha ${campaignId}${accountId ? `, conta ${accountId}` : ''}`);
      
      // Validar dados dos clientes
      if (!clients || clients.length === 0) {
        console.error('Nenhum cliente fornecido para chamadas em massa');
        return { success: false, message: 'Nenhum cliente selecionado para chamada' };
      }
      
      // Log os primeiros 5 clientes (ou todos se forem menos que 5)
      const sampleClients = clients.slice(0, 5);
      console.log('Amostra de clientes para disparo em massa:', sampleClients);
      
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
      
      // Prepara o payload para o webhook com todos os clientes no array
      const payload: {
        action: string;
        campaign_id: number;
        clients: Array<{id: number, phone: string, name: string}>;
        account_id?: string;
        additional_data?: {
          timestamp: string;
          client_version: string;
          source: string;
          assistant_id?: string;
          assistant_name?: string;
          bulk_call: boolean;
        };
      } = {
        action: 'initiate_bulk_calls',
        campaign_id: campaignId,
        clients: clients,  // Array completo de clientes
        account_id: accountId, // Incluir account_id se fornecido
        additional_data: {
          timestamp: new Date().toISOString(),
          client_version: CLIENT_VERSION,
          source: 'bulk_call',
          bulk_call: true  // Flag para indicar que é um disparo em massa
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
        return { 
          success: true, 
          message: `Chamadas em massa iniciadas com sucesso para ${clients.length} clientes`, 
          data: { clientCount: clients.length, campaignId, accountId } 
        };
      } else {
        return { success: false, message: 'Falha ao iniciar chamadas em massa', data: null };
      }
    } catch (error) {
      console.error('Erro geral ao disparar webhook de chamadas em massa:', error);
      toast.error(`Erro ao realizar chamadas em massa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return { success: false };
    }
  },
  
  
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
