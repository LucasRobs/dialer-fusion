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
  async triggerCallWebhook(data: any) {
    try {
      console.log('Disparando webhook com os dados:', data);

      // Registrar o webhook na tabela webhook_logs
      await supabase.from('webhook_logs').insert([{
        action: data.action,
        webhook_url: 'vapi',
        request_data: data,
        success: true
      }]);

      // Simular uma resposta de sucesso
      return {
        success: true,
        message: 'Webhook disparado com sucesso',
        data: data
      };
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
        .eq('id', data.campaign_id)
        .single();

      if (campaignError) {
        console.error('Erro ao buscar campanha:', campaignError);
        throw campaignError;
      }

      // 3. Calcular novas estatísticas
      const newAnsweredCalls = (campaignData.answered_calls || 0) + 1;
      
      let newAverageDuration = campaignData.average_duration || 0;
      if (data.call_duration) {
        const totalDurationBefore = (campaignData.average_duration || 0) * (campaignData.answered_calls || 0);
        const totalDurationAfter = totalDurationBefore + data.call_duration;
        newAverageDuration = Math.round(totalDurationAfter / newAnsweredCalls);
      }

      // 4. Atualizar campanha com novas estatísticas
      const { error: updateCampaignError } = await supabase
        .from('campaigns')
        .update({
          answered_calls: newAnsweredCalls,
          average_duration: newAverageDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.campaign_id);

      if (updateCampaignError) {
        console.error('Erro ao atualizar estatísticas da campanha:', updateCampaignError);
        throw updateCampaignError;
      }

      // 5. Verificar e criar ou atualizar o registro da chamada
      const { data: existingCall, error: checkCallError } = await supabase
        .from('calls')
        .select('id')
        .match({
          campaign_id: data.campaign_id,
          client_id: data.client_id
        })
        .maybeSingle();

      if (checkCallError) {
        console.error('Erro ao verificar chamada existente:', checkCallError);
        throw checkCallError;
      }

      if (!existingCall) {
        // 5.1 Criar novo registro de chamada
        const callData = {
          campaign_id: data.campaign_id,
          client_id: data.client_id,
          status: data.call_status || 'completed',
          call_start: data.call_start || new Date().toISOString(),
          call_end: data.call_end || new Date().toISOString(),
          duration: data.call_duration || 0,
          call_summary: data.call_summary || '',
          recording_url: data.recording_url || '',
          assistant_id: data.assistant_id || campaignData.assistant_id || null
        };

        const { error: insertCallError } = await supabase
          .from('calls')
          .insert([callData]);

        if (insertCallError) {
          console.error('Erro ao criar registro de chamada:', insertCallError);
          throw insertCallError;
        }
      } else if (data.call_duration || data.call_end || data.call_summary) {
        // 5.2 Atualizar registro de chamada existente
        const updateData: any = {};
        if (data.call_status) updateData.status = data.call_status;
        if (data.call_duration) updateData.duration = data.call_duration;
        if (data.call_end) updateData.call_end = data.call_end;
        if (data.call_summary) updateData.call_summary = data.call_summary;
        if (data.recording_url) updateData.recording_url = data.recording_url;
        
        const { error: updateCallError } = await supabase
          .from('calls')
          .update(updateData)
          .eq('id', existingCall.id);

        if (updateCallError) {
          console.error('Erro ao atualizar registro de chamada:', updateCallError);
          throw updateCallError;
        }
      }

      return {
        success: true,
        message: 'Dados de chamada processados com sucesso',
        campaign_id: data.campaign_id,
        client_id: data.client_id,
        answered_calls: newAnsweredCalls
      };
    } catch (error) {
      console.error('Erro ao processar dados de chamada:', error);
      throw error;
    }
  }
};
