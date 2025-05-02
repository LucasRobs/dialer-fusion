
import { VAPI_CONFIG } from '@/integrations/supabase/client';
import { supabase } from '@/lib/supabase';

export type VapiAssistant = {
  id: string;
  name: string;
  assistant_id: string;
  first_message: string;
  system_prompt: string;
  user_id: string;
  status: string;
  model: string;
  voice: string;
  voice_id: string;
  created_at: string;
  metadata: any; // This is a required property
  published?: boolean;
  updated_at?: string;
};

export type WebhookPayload = {
  action: string;
  assistant_id: string;
  assistant_name: string;
  timestamp: string;
  user_id: string;
  client_id?: number;
  phone_number?: string;
  // Adding additional properties that are being used in the application
  campaign_id?: any;
  client_name?: any;
  client_phone?: any;
  call_id?: string;
  account_id?: any; // Adding this field
  call?: {
    model: string;
    voice: string;
    language: string;
  };
  additional_data?: any;
};

export const webhookService = {
  async getAssistantsFromVapiApi(): Promise<any[]> {
    try {
      const response = await fetch(`${VAPI_CONFIG.API_URL}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Vapi API error (${response.status}):`, errorText);
        throw new Error(`Vapi API returned status ${response.status}: ${errorText}`);
      }

      const assistants = await response.json();
      return assistants;
    } catch (error) {
      console.error('Error fetching assistants from Vapi API:', error);
      throw error;
    }
  },

  async getAllAssistants(userId?: string): Promise<VapiAssistant[]> {
    try {
      console.log('Fetching all assistants for user ID:', userId);
      
      // First try to get from Supabase if user id is provided
      if (userId) {
        let query = supabase
          .from('assistants')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching assistants from Supabase:', error);
        } else if (data && data.length > 0) {
          console.log(`Found ${data.length} assistants in Supabase`);
          
          // Format the data to match VapiAssistant type
          return data.map(assistant => ({
            ...assistant,
            metadata: assistant.metadata || { user_id: assistant.user_id }
          })) as VapiAssistant[];
        }
      }
      
      // If no data from Supabase, try the Vapi API
      const vapiAssistants = await this.getAssistantsFromVapiApi();
      
      if (userId) {
        // Filter by the user ID if provided
        return vapiAssistants.filter(assist => 
          assist.metadata?.user_id === userId
        );
      }
      
      return vapiAssistants;
    } catch (error) {
      console.error('Error in getAllAssistants:', error);
      return [];
    }
  },
  
  async getLocalAssistants(userId?: string): Promise<VapiAssistant[]> {
    try {
      console.log('Fetching assistants from Supabase for user ID:', userId);
      
      let query = supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching assistants from Supabase:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Format the data to match VapiAssistant type, ensure metadata exists
      return data.map(assistant => ({
        ...assistant,
        metadata: assistant.metadata || { user_id: assistant.user_id }
      })) as VapiAssistant[];
    } catch (error) {
      console.error('Error in getLocalAssistants:', error);
      return [];
    }
  },

  async syncVapiAssistantsToSupabase(assistants: any[]): Promise<boolean> {
    try {
      console.log('Syncing assistants to Supabase:', assistants.length);
      
      if (!assistants || assistants.length === 0) {
        return true;
      }
      
      for (const asst of assistants) {
        if (!asst) continue;
        
        try {
          // Format the assistant for Supabase
          const formattedAssistant = {
            id: `vapi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: asst.name || 'Unnamed Assistant',
            assistant_id: asst.id || asst.assistant_id,
            first_message: asst.first_message || asst.firstMessage || '',
            system_prompt: asst.instructions || asst.system_prompt || '',
            user_id: asst.metadata?.user_id || '',
            status: asst.status || 'active',
            model: (asst.model && asst.model.model) || asst.model || 'gpt-4o-turbo',
            voice: (asst.voice && asst.voice.voiceId) || asst.voice || '33B4UnXyTNbgLmdEDh5P',
            voice_id: (asst.voice && asst.voice.voiceId) || asst.voice_id || '33B4UnXyTNbgLmdEDh5P',
            created_at: asst.createdAt || new Date().toISOString(),
          };
          
          // Check if it already exists
          const { data: existing } = await supabase
            .from('assistants')
            .select('id')
            .eq('assistant_id', formattedAssistant.assistant_id)
            .maybeSingle();
            
          if (existing) {
            console.log(`Assistant ${asst.name} already exists in Supabase, skipping`);
            continue;
          }
          
          // Insert into Supabase
          const { error } = await supabase
            .from('assistants')
            .insert([formattedAssistant]);
            
          if (error) {
            console.error('Error inserting assistant into Supabase:', error);
          }
        } catch (err) {
          console.error('Error processing assistant for Supabase sync:', err);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in syncVapiAssistantsToSupabase:', error);
      return false;
    }
  },

  async makeCall(assistantId: number, phoneNumber: string, clientId: number): Promise<any> {
    try {
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/makecall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          phone_number: phoneNumber,
          client_id: clientId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Webhook error (${response.status}):`, errorText);
        throw new Error(`Webhook returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  },
  
  async triggerCallWebhook(payload: WebhookPayload): Promise<any> {
    try {
      console.log('Triggering call webhook with payload:', payload);
      
      // Ensure we have the required fields for WebhookPayload
      const enhancedPayload = {
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString(),
        assistant_id: payload.assistant_id || "",
        assistant_name: payload.assistant_name || "",
        user_id: payload.user_id || "",
        action: payload.action || "make_call"
      };
      
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': VAPI_CONFIG.API_KEY,
        },
        body: JSON.stringify(enhancedPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Call webhook error (${response.status}):`, errorText);
        throw new Error(`Call webhook returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Call webhook response:', result);
      return result;
    } catch (error) {
      console.error('Error triggering call webhook:', error);
      throw error;
    }
  },
  
  async sendFirstMessageToWebhook(
    assistantId: string, 
    phoneNumber: string = "", 
    clientId: number = 0, 
    message: string = ""
  ): Promise<any> {
    try {
      console.log('Sending first message to webhook');
      
      const payload = {
        action: 'send_first_message',
        assistant_id: assistantId,
        assistant_name: "", // Add a default empty string for assistant_name
        phone_number: phoneNumber,
        client_id: clientId,
        message: message || "Olá, como posso ajudar?",
        timestamp: new Date().toISOString(),
        user_id: "", // Add a default empty string for user_id
        api_key: VAPI_CONFIG.API_KEY
      };
      
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': VAPI_CONFIG.API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Send first message error (${response.status}):`, errorText);
        throw new Error(`Send first message returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Send first message response:', result);
      return result;
    } catch (error) {
      console.error('Error sending first message:', error);
      throw error;
    }
  },

  async createAssistant(data: {
    name: string;
    first_message: string;
    system_prompt: string;
    userId: string;
  }): Promise<VapiAssistant | null> {
    try {
      console.log('Creating assistant with webhook:', data);
      
      // Ensure we have valid metadata with user_id
      const metadata = {
        user_id: data.userId,
        created_at: new Date().toISOString()
      };

      // Prepare payload for webhook with API key included
      const payload = {
        name: data.name,
        first_message: data.first_message,
        system_prompt: data.system_prompt,
        api_key: VAPI_CONFIG.API_KEY,
        metadata: metadata
      };

      console.log('Sending data to webhook:', JSON.stringify(payload));
      
      // Create a timeout controller for the fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/createassistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': VAPI_CONFIG.API_KEY,
          'Authorization': `Bearer ${VAPI_CONFIG.API_KEY}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Webhook error (${response.status}):`, errorText);
        throw new Error(`Webhook returned status ${response.status}: ${errorText}`);
      }

      const assistant = await response.json();
      console.log('Assistant created successfully:', assistant);
      
      // Ensure we have a properly formatted assistant object
      const formattedAssistant: VapiAssistant = {
        id: assistant.id || `temp-${Date.now()}`,
        name: data.name,
        assistant_id: assistant.id || assistant.assistant_id,
        first_message: data.first_message,
        system_prompt: data.system_prompt,
        user_id: data.userId,
        status: 'active',
        model: 'gpt-4o-turbo',
        voice: '33B4UnXyTNbgLmdEDh5P',
        voice_id: '33B4UnXyTNbgLmdEDh5P',
        created_at: new Date().toISOString(),
        metadata: metadata
      };
      
      return formattedAssistant;
    } catch (error) {
      console.error('Error creating assistant:', error);
      throw error;
    }
  },

  async deleteAssistant(assistantId: string): Promise<boolean> {
    try {
      if (!assistantId) {
        console.error('No assistant ID provided for deletion');
        return false;
      }
      
      console.log(`Deleting assistant with ID: ${assistantId}`);

      // Create payload with API key
      const payload = {
        assistant_id: assistantId,
        api_key: VAPI_CONFIG.API_KEY
      };

      // Create a timeout controller
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      console.log('Sending deletion request to webhook:', JSON.stringify(payload));

      // Make the API call to the webhook with API key in both payload and headers
      const response = await fetch('https://primary-production-31de.up.railway.app/webhook/deleteassistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vapi-Auth': VAPI_CONFIG.API_KEY,
          'X-Api-Key': VAPI_CONFIG.API_KEY,
          'Authorization': `Bearer ${VAPI_CONFIG.API_KEY}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Webhook deletion error (${response.status}):`, errorText);
        
        // If webhook fails, try direct deletion from Vapi API as fallback
        console.log('Webhook failed, attempting direct deletion from Vapi API');
        return this.deleteAssistantDirectly(assistantId);
      }
      
      const result = await response.json();
      console.log('Assistant deletion result:', result);
      
      return result.success === true;
    } catch (error) {
      console.error('Error in deleteAssistant:', error);
      
      // Try direct deletion as a fallback
      console.log('Exception caught, attempting direct deletion from Vapi API as fallback');
      return this.deleteAssistantDirectly(assistantId);
    }
  },
  
  // Add a direct deletion method as fallback
  async deleteAssistantDirectly(assistantId: string): Promise<boolean> {
    try {
      console.log(`Attempting direct deletion from Vapi API for assistant: ${assistantId}`);
      
      const response = await fetch(`${VAPI_CONFIG.API_URL}/assistant/${assistantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VAPI_CONFIG.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Direct deletion error (${response.status}):`, errorText);
        return false;
      }
      
      console.log('Assistant successfully deleted directly from Vapi API');
      return true;
    } catch (error) {
      console.error('Error in direct deletion:', error);
      return false;
    }
  },
};
