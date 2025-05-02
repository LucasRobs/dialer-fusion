import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Type definition for assistant
export interface VapiAssistant {
  id: string;
  name: string;
  assistant_id?: string;
  first_message?: string;
  system_prompt?: string;
  user_id?: string;
  created_at?: string;
  status?: string;
  model?: string;  
  voice?: string;  
  voice_id?: string;
}

// Type definition for assistant creation parameters
interface AssistantCreationParams {
  name: string;
  first_message: string;
  system_prompt: string;
  userId: string;
}

// Type definition for call parameters
interface CallParams {
  assistant_id: number | string;
  phone_number: string;
  client_id: number;
}

// Type definition for webhook payload
export interface WebhookPayload {
  action: string;
  campaign_id?: number;
  client_name?: string;
  client_phone?: string;
  client_id?: number;
  user_id?: string;
  account_id?: string;
  provider?: string;
  call_id?: string;
  call?: {
    model?: string | {
      provider?: string;
      model?: string;
      temperature?: number;
      systemPrompt?: string;
    };
    voice?: string | {
      provider?: string;
      model?: string;
      voiceId?: string;
    };
    language?: string;
    first_message?: string;
    system_prompt?: string;
  };
  additional_data?: Record<string, any>;
}

// WebhookService for interacting with webhook endpoints
export const webhookService = {
  // Create an assistant
  async createAssistant(assistant: AssistantCreationParams): Promise<VapiAssistant> {
    try {
      // Set up the webhook call to create assistant
      const webhookUrl = 'https://primary-production-31de.up.railway.app/webhook/createassistant';
      
      // Create payload for webhook
      const payload = {
        action: "create_assistant",
        name: assistant.name,
        first_message: assistant.first_message,
        system_prompt: assistant.system_prompt,
        user_id: assistant.userId,
        timestamp: new Date().toISOString()
      };
      
      // Send request to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Check for errors in response
      if (!response.ok) {
        toast.error('Não foi possível criar o assistente. Por favor, tente novamente.');
        throw new Error();
      }
      
      // Parse response to get created assistant data
      const data = await response.json();
      
      // Enhanced validation of webhook response
      if (!data) {
        toast.error('Não foi possível criar o assistente. Por favor, tente novamente.');
        throw new Error();
      }
      
      // Check for error field in response
      if (data.error) {
        toast.error('Não foi possível criar o assistente. Por favor, tente novamente.');
        throw new Error();
      }
      
      // Validate required fields exist
      if (!data.assistant_id || !data.name) {
        toast.error('Ocorreu um erro ao criar o assistente. Por favor, tente novamente.');
        throw new Error();
      }
      
      // Create the assistant object
      const newAssistant: VapiAssistant = {
        id: data.supabase_id || data.assistant_id, 
        name: data.name,
        assistant_id: data.assistant_id, 
        first_message: assistant.first_message,
        system_prompt: assistant.system_prompt,
        user_id: assistant.userId,
        status: data.status || 'active',
        model: data.model || 'gpt-4o-turbo', 
        voice: data.voice || '33B4UnXyTNbgLmdEDh5P',  
        voice_id: data.voice_id || '33B4UnXyTNbgLmdEDh5P',
        created_at: new Date().toISOString()
      };
      
      // Insert the assistant into Supabase to ensure it appears in the list immediately
      const { data: insertedData, error: insertError } = await supabase
        .from('assistants')
        .insert([newAssistant])
        .select()
        .single();
        
      if (insertError) {
        // If there's an error inserting, we'll still return the assistant but show a warning
        toast.warning('O assistente foi criado, mas pode não aparecer na lista imediatamente.');
        console.log('Erro ao inserir assistente no banco de dados local:', insertError);
      } else if (insertedData) {
        // Use the inserted data which will have the correct ID
        newAssistant.id = insertedData.id;
      }
      
      toast.success('Assistente criado com sucesso!');
      
      // Return the created assistant
      return newAssistant;
    } catch (error) {
      toast.error('Não foi possível criar o assistente. Por favor, tente novamente.');
      throw new Error();
    }
  },
  
  // Get all assistants for a user
  async getAllAssistants(userId: string): Promise<VapiAssistant[]> {
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        toast.error('Não foi possível buscar os assistentes.');
        throw error;
      }
      
      return data || [];
    } catch (error) {
      toast.error('Problema ao carregar assistentes.');
      return [];
    }
  },
  
  // Alias for getAllAssistants to maintain compatibility with existing code
  async getLocalAssistants(userId: string): Promise<VapiAssistant[]> {
    return this.getAllAssistants(userId);
  },
  
  // Delete an assistant
  async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      // Delete from local database
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', assistantId);
      
      if (error) {
        toast.error('Erro ao remover assistente.');
        throw error;
      }
      
      toast.success('Assistente removido com sucesso!');
      return true;
    } catch (error) {
      toast.error('Não foi possível excluir o assistente.');
      return false;
    }
  },
  
  // Make a call with a specific assistant
  async makeCall(assistantId: number | string, phoneNumber: string, clientId: number): Promise<{ success: boolean, message: string }> {
    try {
      // Set up the webhook call to make a call
      const webhookUrl = 'https://primary-production-31de.up.railway.app/webhook/collowop';
      
      const payload = {
        action: 'make_call',
        assistant_id: assistantId,
        phone_number: phoneNumber,
        client_id: clientId,
        timestamp: new Date().toISOString()
      };
      
      // Send request to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Check for errors in response
      if (!response.ok) {
        toast.error('Não foi possível iniciar a chamada.');
        return { 
          success: false, 
          message: 'Não foi possível iniciar a chamada.' 
        };
      }
      
      // Parse response
      const data = await response.json();
      toast.success('Chamada iniciada com sucesso!');
      
      return { 
        success: true, 
        message: 'Chamada iniciada com sucesso!' 
      };
    } catch (error) {
      toast.error('Erro ao iniciar a chamada.');
      return { 
        success: false, 
        message: 'Erro ao iniciar a chamada.' 
      };
    }
  },
  
  // Trigger a generic webhook call
  async triggerCallWebhook(payload: WebhookPayload): Promise<{ success: boolean, message: string }> {
    try {
      // Determine which webhook URL to use based on action
      let webhookUrl = 'https://primary-production-31de.up.railway.app/webhook/collowop';
      
      if (payload.action === 'stop_campaign') {
        webhookUrl = 'https://primary-production-31de.up.railway.app/webhook/stop_campaign';
      } else if (payload.action === 'delete_assistant') {
        webhookUrl = 'https://primary-production-31de.up.railway.app/webhook/deleteassistant';
      }
      
      // Send request to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Check for errors in response
      if (!response.ok) {
        toast.error('A operação não pôde ser concluída.');
        return { 
          success: false, 
          message: 'A operação não pôde ser concluída.' 
        };
      }
      
      // Parse response
      const data = await response.json();
      toast.success('Operação realizada com sucesso!');
      
      return { 
        success: true, 
        message: 'Operação realizada com sucesso!' 
      };
    } catch (error) {
      toast.error('Erro ao executar operação.');
      return { 
        success: false, 
        message: 'Erro ao executar operação.' 
      };
    }
  },
  
  // Send first message to webhook
  async sendFirstMessageToWebhook(assistantId: string): Promise<{ success: boolean, message: string }> {
    try {
      // Get the assistant from Supabase to get the first message
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
        
      if (error) {
        toast.error('Erro ao enviar mensagem inicial.');
        return { 
          success: false, 
          message: 'Erro ao enviar mensagem inicial.' 
        };
      }
      
      if (!data || !data.first_message) {
        toast.error('Mensagem inicial não encontrada.');
        return { 
          success: false, 
          message: 'Mensagem inicial não encontrada.' 
        };
      }
      
      const payload = {
        action: 'send_first_message',
        assistant_id: data.assistant_id || assistantId,
        first_message: data.first_message,
        timestamp: new Date().toISOString()
      };
      
      // Set up the webhook call to send the first message
      const webhookUrl = 'https://primary-production-31de.up.railway.app/webhook/first_message';
      
      // Send request to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Check for errors in response
      if (!response.ok) {
        toast.error('Erro ao enviar mensagem inicial.');
        return { 
          success: false, 
          message: 'Erro ao enviar mensagem inicial.' 
        };
      }
      
      // Parse response
      const data2 = await response.json();
      toast.success('Mensagem inicial enviada com sucesso!');
      
      return { 
        success: true, 
        message: 'Mensagem inicial enviada com sucesso!' 
      };
    } catch (error) {
      toast.error('Erro ao enviar mensagem inicial.');
      return { 
        success: false, 
        message: 'Erro ao enviar mensagem inicial.' 
      };
    }
  },
  
  // Get assistants from Vapi API directly
  async getAssistantsFromVapiApi(): Promise<any[]> {
    try {
      const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";
      const VAPI_API_URL = "https://api.vapi.ai";
      
      const response = await fetch(`${VAPI_API_URL}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        toast.error('Não foi possível buscar assistentes da API.');
        return [];
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      toast.error('Erro ao buscar assistentes da API.');
      return [];
    }
  }
};

export default webhookService;
