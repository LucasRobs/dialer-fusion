
import { supabase } from '@/lib/supabase';

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

// WebhookService for interacting with webhook endpoints
export const webhookService = {
  // Create an assistant
  async createAssistant(assistant: AssistantCreationParams): Promise<VapiAssistant> {
    console.log("Creating assistant with data:", assistant);
    
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
      
      console.log("Sending webhook payload:", JSON.stringify(payload));
      
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
        const errorText = await response.text();
        console.error('Error response from webhook:', response.status, errorText);
        throw new Error(`Webhook error: ${response.status} ${errorText}`);
      }
      
      // Parse response to get created assistant data
      const data = await response.json();
      console.log("Response from webhook:", data);
      
      if (!data.assistant_id || !data.name) {
        throw new Error("Invalid assistant data returned from webhook");
      }
      
      // Return the created assistant
      return {
        id: data.supabase_id || data.assistant_id, // Use Supabase ID if available, or fallback to Vapi assistant_id
        name: data.name,
        assistant_id: data.assistant_id, // The Vapi assistant ID 
        first_message: assistant.first_message,
        system_prompt: assistant.system_prompt,
        user_id: assistant.userId,
        status: data.status || 'active'
      };
    } catch (error) {
      console.error("Error creating assistant:", error);
      throw new Error(`Failed to create assistant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  
  // Get all assistants for a user
  async getAllAssistants(userId: string): Promise<VapiAssistant[]> {
    console.log("Getting assistants for user:", userId);
    
    try {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} assistants for user ${userId}`);
      return data || [];
    } catch (error) {
      console.error("Error getting assistants:", error);
      throw new Error(`Failed to get assistants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  
  // Delete an assistant
  async deleteAssistant(assistantId: string): Promise<boolean> {
    console.log("Deleting assistant with ID:", assistantId);
    
    try {
      // Delete from local database
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', assistantId);
      
      if (error) {
        throw error;
      }
      
      console.log(`Successfully deleted assistant ${assistantId} from database`);
      return true;
    } catch (error) {
      console.error("Error deleting assistant:", error);
      throw new Error(`Failed to delete assistant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  
  // Make a call with a specific assistant
  async makeCall(assistantId: number | string, phoneNumber: string, clientId: number): Promise<{ success: boolean, message: string }> {
    console.log(`Making call with assistant ${assistantId} to ${phoneNumber}`);
    
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
      
      console.log("Sending webhook payload for call:", JSON.stringify(payload));
      
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
        const errorText = await response.text();
        console.error('Error response from webhook:', response.status, errorText);
        throw new Error(`Webhook error: ${response.status} ${errorText}`);
      }
      
      // Parse response
      const data = await response.json();
      console.log("Response from webhook for call:", data);
      
      return { 
        success: true, 
        message: 'Call initiated successfully' 
      };
    } catch (error) {
      console.error("Error making call:", error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to initiate call' 
      };
    }
  }
};

export default webhookService;
