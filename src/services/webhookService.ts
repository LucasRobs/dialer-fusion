import { VAPI_CONFIG } from '@/integrations/supabase/client';

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
  metadata: any;
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
