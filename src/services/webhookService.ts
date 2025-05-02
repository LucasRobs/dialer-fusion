
import { supabase } from '@/integrations/supabase/client';
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
  metadata?: {
    user_id?: string;
    [key: string]: any;
  };
}

// Type definition to match Supabase schema requirements
interface SupabaseAssistant {
  id?: string;
  name: string;
  assistant_id: string;
  first_message?: string;
  system_prompt?: string;
  user_id?: string;
  created_at?: string;
  status?: string;
  model?: string;
  voice?: string;
  voice_id?: string;
  published?: boolean;
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
      console.log('Creating assistant with params:', assistant);
      
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
      console.log('Sending webhook request:', payload);
      
      // Set timeout for fetch to handle slow responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Webhook error: ${response.status} ${errorText}`);
          throw new Error(`Webhook error: ${response.status} ${errorText}`);
        }
        
        // Parse webhook response if possible
        let vapiResponse = null;
        let vapiAssistantId = null;
        
        try {
          vapiResponse = await response.json();
          console.log('Webhook response received:', vapiResponse);
          
          // Extract the Vapi assistant ID if available
          if (vapiResponse && vapiResponse.assistant_id) {
            vapiAssistantId = vapiResponse.assistant_id;
            console.log('Extracted Vapi assistant ID:', vapiAssistantId);
          }
        } catch (parseError) {
          console.error('Error parsing webhook response:', parseError);
          // Continue with default assistant
        }
        
        // Create assistant object combining data from Vapi and our params
        let newAssistant: VapiAssistant = {
          id: `local-${Date.now()}`, 
          name: assistant.name,
          assistant_id: vapiAssistantId || `local-${Date.now()}`,
          first_message: assistant.first_message,
          system_prompt: assistant.system_prompt,
          user_id: assistant.userId,
          status: 'active',
          model: 'gpt-4o-turbo',
          voice: '33B4UnXyTNbgLmdEDh5P',
          voice_id: '33B4UnXyTNbgLmdEDh5P',
          created_at: new Date().toISOString(),
          metadata: {
            user_id: assistant.userId,
            created_at: new Date().toISOString()
          }
        };
        
        // Update the assistant with data from Vapi response if available
        if (vapiResponse) {
          if (vapiResponse.id) {
            newAssistant.id = vapiResponse.supabase_id || vapiResponse.id;
          }
          if (vapiResponse.model) {
            newAssistant.model = vapiResponse.model;
          }
          if (vapiResponse.voice) {
            newAssistant.voice = vapiResponse.voice;
          }
          if (vapiResponse.voice_id) {
            newAssistant.voice_id = vapiResponse.voice_id;
          }
          if (vapiResponse.status) {
            newAssistant.status = vapiResponse.status;
          }
          if (vapiResponse.metadata) {
            newAssistant.metadata = {
              ...newAssistant.metadata,
              ...vapiResponse.metadata
            };
          }
        }
        
        // Make sure user_id is set in metadata
        if (!newAssistant.metadata?.user_id) {
          newAssistant.metadata = {
            ...newAssistant.metadata,
            user_id: assistant.userId
          };
        }
        
        console.log('New assistant object to insert into Supabase:', newAssistant);
        
        // Insert the assistant into Supabase with multiple retries
        await this.saveAssistantToSupabase(newAssistant, assistant.userId);
        
        // Also try direct API call to Vapi to confirm creation
        try {
          if (vapiAssistantId) {
            // Verify assistant exists in Vapi API directly
            const vapiAssistants = await this.getAssistantsFromVapiApi();
            const foundInVapi = vapiAssistants.some(a => a.id === vapiAssistantId);
            console.log(`Assistant ID ${vapiAssistantId} found in Vapi API: ${foundInVapi}`);
          }
        } catch (verifyError) {
          console.error('Error verifying assistant in Vapi API:', verifyError);
        }
        
        // Return the assistant object
        return newAssistant;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('Webhook request timed out');
          throw new Error('Webhook request timed out. Trying direct Supabase insert.');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('Error in createAssistant:', error);
      
      // Create a fallback assistant to ensure something appears in the UI
      const fallbackAssistant: VapiAssistant = {
        id: `local-${Date.now()}`,
        name: assistant.name,
        assistant_id: `fallback-${Date.now()}`,
        first_message: assistant.first_message,
        system_prompt: assistant.system_prompt,
        user_id: assistant.userId,
        status: 'active',
        model: 'gpt-4o-turbo',
        voice: '33B4UnXyTNbgLmdEDh5P',
        voice_id: '33B4UnXyTNbgLmdEDh5P',
        created_at: new Date().toISOString(),
        metadata: {
          user_id: assistant.userId,
          created_at: new Date().toISOString()
        }
      };
      
      console.log('Created fallback assistant:', fallbackAssistant);
      
      // Try to insert the fallback into Supabase directly
      await this.saveAssistantToSupabase(fallbackAssistant, assistant.userId);
      
      return fallbackAssistant;
    }
  },
  
  // Helper method to save assistant to Supabase with retries
  async saveAssistantToSupabase(assistant: VapiAssistant, userId: string): Promise<boolean> {
    let insertedAssistant = null;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Supabase insert attempt ${retryCount + 1} for assistant:`, assistant.name);
        
        // Convert from VapiAssistant to SupabaseAssistant format
        // Ensuring required fields are present and properly typed
        const assistantToInsert: SupabaseAssistant = {
          id: assistant.id,
          name: assistant.name,
          assistant_id: assistant.assistant_id || `local-${Date.now()}`, // Make sure assistant_id is never undefined
          first_message: assistant.first_message,
          system_prompt: assistant.system_prompt,
          user_id: userId,
          status: assistant.status,
          model: assistant.model,
          voice: assistant.voice,
          voice_id: assistant.voice_id,
          created_at: assistant.created_at,
          published: false // Default value
        };
        
        const { data, error } = await supabase
          .from('assistants')
          .insert(assistantToInsert) // Insert a single properly formatted record
          .select()
          .single();
        
        if (error) {
          console.error(`Supabase insert error (attempt ${retryCount + 1}):`, error);
          
          // Try checking if assistant already exists by name or assistant_id
          if (error.code === '23505') { // Duplicate key error
            console.log('Assistant may already exist, checking...');
            
            // Check if assistant exists by assistant_id
            if (assistant.assistant_id) {
              const { data: existingByAssistantId } = await supabase
                .from('assistants')
                .select('*')
                .eq('assistant_id', assistant.assistant_id)
                .maybeSingle();
                
              if (existingByAssistantId) {
                console.log('Assistant already exists by assistant_id, returning success');
                return true;
              }
            }
            
            // Check if assistant exists by name and user_id
            const { data: existingByName } = await supabase
              .from('assistants')
              .select('*')
              .eq('name', assistant.name)
              .eq('user_id', userId)
              .maybeSingle();
              
            if (existingByName) {
              console.log('Assistant already exists by name and user_id, returning success');
              return true;
            }
          }
          
          retryCount++;
          
          if (retryCount >= maxRetries) {
            console.error('Max retries reached for Supabase insert');
            // Continue anyway, let's not block the UI
            break;
          } else {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            continue;
          }
        } else {
          console.log('Assistant successfully inserted into Supabase:', data);
          insertedAssistant = data;
          return true;
        }
      } catch (insertError) {
        console.error(`Supabase insert exception (attempt ${retryCount + 1}):`, insertError);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error('Max retries reached for Supabase insert');
          return false;
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    }
    
    // If we get here, all retries failed but we don't want to block the UI
    return false;
  },
  
  // Get all assistants for a user
  async getAllAssistants(userId: string): Promise<VapiAssistant[]> {
    try {
      console.log('Getting assistants for user:', userId);
      
      // Direct query to Supabase for faster results
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching assistants from Supabase:', error);
        toast.error('Não foi possível buscar os assistentes.');
        return [];
      }
      
      console.log('Assistants found:', data?.length || 0);
      
      // If no assistants found in Supabase, try to get them from Vapi API
      if (!data || data.length === 0) {
        console.log('No assistants found in Supabase, trying to sync from Vapi API');
        try {
          const vapiAssistants = await this.getAssistantsFromVapiApi();
          const userVapiAssistants = vapiAssistants.filter(a => 
            a.metadata?.user_id === userId
          );
          
          if (userVapiAssistants.length > 0) {
            console.log('Found assistants in Vapi API, syncing to Supabase:', userVapiAssistants.length);
            await this.syncVapiAssistantsToSupabase(userVapiAssistants);
            
            // Retry getting from Supabase after sync
            const { data: syncedData, error: syncedError } = await supabase
              .from('assistants')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
              
            if (syncedError) {
              console.error('Error fetching synced assistants from Supabase:', syncedError);
            } else {
              console.log('Synced assistants retrieved:', syncedData?.length || 0);
              return syncedData || [];
            }
          }
        } catch (syncError) {
          console.error('Error syncing assistants from Vapi API:', syncError);
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAllAssistants:', error);
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
  
  // Get assistants from Vapi API directly and filter by user
  async getAssistantsFromVapiApi(): Promise<any[]> {
    try {
      const { VAPI_CONFIG } = await import('@/integrations/supabase/client');
      
      // Set timeout for fetch to handle slow responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(`${VAPI_CONFIG.API_URL}/assistant`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VAPI_CONFIG.API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Vapi API error: ${response.status} ${errorText}`);
          toast.error('Não foi possível buscar assistentes da API.');
          return [];
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data.length} assistants from Vapi API`);
        
        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('Vapi API request timed out');
          toast.error('Requisição Vapi API expirou. Tente novamente.');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching from Vapi API:', error);
      toast.error('Erro ao buscar assistentes da API.');
      return [];
    }
  },
  
  // Sync assistants from Vapi API to Supabase
  async syncVapiAssistantsToSupabase(vapiAssistants: any[]): Promise<void> {
    try {
      if (!Array.isArray(vapiAssistants) || vapiAssistants.length === 0) {
        console.log('No Vapi assistants to sync');
        return;
      }
      
      console.log('Syncing assistants from Vapi to Supabase:', vapiAssistants.length);
      
      // Convert Vapi assistants to our format
      for (const assistant of vapiAssistants) {
        try {
          const userId = assistant.metadata?.user_id;
          
          // Skip assistants without user_id
          if (!userId) {
            console.log('Skipping assistant without user_id:', assistant.name);
            continue;
          }
          
          console.log('Processing assistant for sync:', assistant.name, 'with user_id:', userId);
          
          // Check if the assistant already exists in Supabase by assistant_id
          const { data: existingAssistant, error: queryError } = await supabase
            .from('assistants')
            .select('*')
            .eq('assistant_id', assistant.id)
            .maybeSingle();
          
          if (queryError) {
            console.error('Error checking if assistant exists:', queryError);
            continue;
          }
          
          const formattedAssistant = {
            name: assistant.name || 'Assistente sem nome',
            assistant_id: assistant.id,
            first_message: assistant.first_message || assistant.firstMessage || '',
            system_prompt: assistant.instructions || assistant.system_prompt || '',
            user_id: userId,
            status: assistant.status || 'active',
            model: (assistant.model && assistant.model.model) || assistant.model || 'gpt-4o-turbo',
            voice: (assistant.voice && assistant.voice.voiceId) || assistant.voice || '33B4UnXyTNbgLmdEDh5P',
            voice_id: (assistant.voice && assistant.voice.voiceId) || assistant.voice_id || '33B4UnXyTNbgLmdEDh5P',
            created_at: assistant.createdAt || new Date().toISOString(),
            metadata: assistant.metadata || { user_id: userId }
          };
          
          if (existingAssistant) {
            console.log('Updating existing assistant in Supabase:', existingAssistant.name);
            // Update existing assistant
            const { error: updateError } = await supabase
              .from('assistants')
              .update(formattedAssistant)
              .eq('id', existingAssistant.id);
            
            if (updateError) {
              console.error('Error updating assistant:', updateError);
            }
          } else {
            console.log('Inserting new assistant into Supabase:', formattedAssistant.name);
            // Insert new assistant with a generated ID
            const { error: insertError } = await supabase
              .from('assistants')
              .insert([{
                id: `vapi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                ...formattedAssistant
              }]);
            
            if (insertError) {
              console.error('Error inserting assistant:', insertError);
            } else {
              console.log('Successfully inserted assistant into Supabase');
            }
          }
        } catch (assistantError) {
          console.error('Error processing individual assistant:', assistantError);
          // Continue with next assistant
        }
      }
      
      console.log('Sync completed');
    } catch (error) {
      console.error('Error syncing assistants:', error);
    }
  }
};

export default webhookService;
