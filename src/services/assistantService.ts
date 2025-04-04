import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Assistant {
  id: string;
  name: string;
  assistant_id: string;
  system_prompt?: string;
  first_message?: string;
  created_at?: string;
  user_id?: string;
  status?: 'pending' | 'ready' | 'failed';
}

const assistantService = {
  async getAllAssistants(userId?: string): Promise<Assistant[]> {
    try {
      console.log('Buscando assistentes para o usuário:', userId);
      
      let query = supabase
        .from('assistants')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by user_id if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar assistentes:', error);
        toast(`Falha ao carregar assistentes: ${error.message}`);
        return [];
      }
      
      console.log(`Encontrados ${data?.length || 0} assistentes`);
      return data || [];
    } catch (error) {
      console.error('Erro em getAllAssistants:', error);
      toast('Falha ao carregar assistentes. Verifique a conexão com o banco de dados.');
      return [];
    }
  },
  
  async saveAssistant(assistant: Omit<Assistant, 'id' | 'created_at'>): Promise<Assistant | null> {
    try {
      console.log('Salvando assistente:', assistant);
      
      const { data, error } = await supabase
        .from('assistants')
        .insert(assistant)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao salvar assistente:', error);
        toast(`Falha ao salvar assistente: ${error.message}`, {
          description: 'Verifique se todos os campos foram preenchidos corretamente'
        });
        return null;
      }
      
      console.log('Assistente salvo com sucesso:', data);
      toast('Assistente salvo com sucesso', {
        description: `O assistente "${data.name}" está pronto para uso`,
      });
      
      // After saving to our database, notify the user's Collowop webhook
      try {
        await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'assistant_created',
            assistant_id: data.assistant_id,
            assistant_name: data.name,
            timestamp: new Date().toISOString(),
            user_id: data.user_id,
            additional_data: {
              is_ready: true,
              system_prompt: data.system_prompt,
              first_message: data.first_message
            }
          }),
        });
        console.log('Successfully notified Collowop webhook about new assistant');
      } catch (webhookError) {
        console.error('Error notifying Collowop webhook:', webhookError);
        // Continue even if the notification fails
      }
      
      return data;
    } catch (error) {
      console.error('Erro em saveAssistant:', error);
      toast('Falha ao salvar assistente');
      return null;
    }
  },

  async updateAssistant(assistantId: string, updates: Partial<Assistant>): Promise<Assistant | null> {
    try {
      console.log(`Atualizando assistente ${assistantId}:`, updates);
      
      const { data, error } = await supabase
        .from('assistants')
        .update(updates)
        .eq('id', assistantId)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar assistente:', error);
        toast(`Falha ao atualizar assistente: ${error.message}`);
        return null;
      }
      
      console.log('Assistente atualizado com sucesso:', data);
      toast('Assistente atualizado com sucesso');
      
      return data;
    } catch (error) {
      console.error('Erro em updateAssistant:', error);
      toast('Falha ao atualizar assistente');
      return null;
    }
  },
  
  async selectAssistant(assistantId: string): Promise<Assistant | null> {
    try {
      console.log(`Selecionando assistente ${assistantId}`);
      
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
      
      if (error) {
        console.error('Erro ao selecionar assistente:', error);
        toast(`Falha ao selecionar assistente: ${error.message}`);
        return null;
      }
      
      console.log('Assistente selecionado:', data);
      toast(`Assistente "${data.name}" selecionado com sucesso`);
      
      // Log IDs specifically for clarity
      console.log('Assistente IDs:', {
        supabaseId: data.id,
        vapiId: data.assistant_id
      });
      
      // Save to localStorage for compatibility with existing code
      localStorage.setItem('selected_assistant', JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.error('Erro em selectAssistant:', error);
      toast('Falha ao selecionar assistente');
      return null;
    }
  },
  
  async getAssistantById(assistantId: string): Promise<Assistant | null> {
    try {
      console.log(`Buscando assistente por ID: ${assistantId}`);
      
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar assistente por ID:', error);
        return null;
      }
      
      console.log('Assistente encontrado:', data);
      return data;
    } catch (error) {
      console.error('Erro em getAssistantById:', error);
      return null;
    }
  },
  
  getSelectedAssistant(): Assistant | null {
    try {
      const assistantJson = localStorage.getItem('selected_assistant');
      if (!assistantJson) {
        console.log('Nenhum assistente selecionado');
        return null;
      }
      
      const assistant = JSON.parse(assistantJson);
      console.log('Assistente carregado do localStorage:', assistant);
      return assistant;
    } catch (error) {
      console.error('Erro ao recuperar assistente do localStorage:', error);
      return null;
    }
  }
};

export default assistantService;
