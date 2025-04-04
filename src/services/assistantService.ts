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
  model?: string;
  voice?: string;
}

// Modelo e voz padrão
const DEFAULT_MODEL = "gpt-4o-turbo";
const DEFAULT_VOICE = "eleven_labs_gemma";

// Vapi API Key
const VAPI_API_KEY = "494da5a9-4a54-4155-bffb-d7206bd72afd";

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
      
      // Se não encontramos assistentes no banco local, tente buscar da API Vapi
      if ((!data || data.length === 0) && VAPI_API_KEY) {
        try {
          console.log('Buscando assistentes da API Vapi...');
          const vapiAssistants = await this.getVapiAssistants();
          if (vapiAssistants && vapiAssistants.length > 0) {
            console.log(`Encontrados ${vapiAssistants.length} assistentes na API Vapi`);
            
            // Filtrar por userId se necessário
            const filteredAssistants = userId 
              ? vapiAssistants.filter(a => a.user_id === userId)
              : vapiAssistants;
              
            return filteredAssistants;
          }
        } catch (vapiError) {
          console.error('Erro ao buscar assistentes da API Vapi:', vapiError);
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro em getAllAssistants:', error);
      toast('Falha ao carregar assistentes. Verifique a conexão com o banco de dados.');
      return [];
    }
  },
  
  async getVapiAssistants(): Promise<Assistant[]> {
    try {
      console.log('Buscando assistentes da API Vapi com a key:', VAPI_API_KEY);
      
      const response = await fetch(`https://api.vapi.ai/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro ao buscar assistentes da Vapi (${response.status}):`, errorText);
        return [];
      }
      
      const vapiAssistants = await response.json();
      console.log('Assistentes da API Vapi:', vapiAssistants);
      
      // Mapear para o formato da nossa aplicação
      return vapiAssistants.map((assistant: any) => ({
        id: assistant.id, // ID da Vapi como ID primário para garantir que estamos usando o ID correto da Vapi
        name: assistant.name,
        assistant_id: assistant.id, // Mesmo ID como assistant_id para compatibilidade
        system_prompt: assistant.instructions,
        first_message: assistant.firstMessage,
        created_at: assistant.createdAt,
        user_id: assistant.metadata?.user_id,
        status: assistant.status || 'ready',
        model: assistant.model || DEFAULT_MODEL,
        voice: assistant.voice || DEFAULT_VOICE
      }));
    } catch (error) {
      console.error('Erro ao buscar assistentes da API Vapi:', error);
      return [];
    }
  },


    // NOVO MÉTODO: Obter ID do assistente da Vapi pelo nome
    async getVapiAssistantIdByName(assistantName: string): Promise<string | null> {
      try {
        console.log(`Buscando ID do assistente da Vapi pelo nome: "${assistantName}"`);
        
        // Primeiro, buscar todos os assistentes da Vapi
        const vapiAssistants = await this.getVapiAssistants();
        
        if (!vapiAssistants || vapiAssistants.length === 0) {
          console.log('Nenhum assistente encontrado na API Vapi');
          return null;
        }
        
        // Procurar assistente pelo nome (case insensitive)
        const matchingAssistant = vapiAssistants.find(
          assistant => assistant.name.toLowerCase() === assistantName.toLowerCase()
        );
        
        if (matchingAssistant) {
          console.log(`Assistente "${assistantName}" encontrado na API Vapi com ID:`, matchingAssistant.id);
          return matchingAssistant.id;
        } else {
          // Procurar por correspondência parcial se não encontrou exata
          const partialMatch = vapiAssistants.find(
            assistant => assistant.name.toLowerCase().includes(assistantName.toLowerCase()) ||
                        assistantName.toLowerCase().includes(assistant.name.toLowerCase())
          );
          
          if (partialMatch) {
            console.log(`Correspondência parcial para "${assistantName}" encontrada: "${partialMatch.name}" com ID:`, partialMatch.id);
            return partialMatch.id;
          }
          
          console.log(`Nenhum assistente encontrado com o nome "${assistantName}"`);
          return null;
        }
      } catch (error) {
        console.error(`Erro ao buscar ID do assistente pelo nome "${assistantName}":`, error);
        return null;
      }
    },
  
  // Obter um assistente específico diretamente da API Vapi
  async getVapiAssistantById(assistantId: string): Promise<Assistant | null> {
    try {
      console.log(`Buscando assistente diretamente da API Vapi por ID: ${assistantId}`);

      // Primeiro tentamos buscar diretamente pelo ID
      const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const assistant = await response.json();
        console.log('Assistente encontrado na API Vapi:', assistant);
        
        return {
          id: assistant.id,
          name: assistant.name,
          assistant_id: assistant.id, // Usar o ID da Vapi também como assistant_id
          system_prompt: assistant.instructions,
          first_message: assistant.firstMessage,
          created_at: assistant.createdAt,
          user_id: assistant.metadata?.user_id,
          status: assistant.status || 'ready',
          model: assistant.model || DEFAULT_MODEL,
          voice: assistant.voice || DEFAULT_VOICE
        };
      }
      
      // Se falhar a busca direta, buscar todos e encontrar pelo ID
      const allAssistants = await this.getVapiAssistants();
      const foundAssistant = allAssistants.find(a => a.id === assistantId || a.assistant_id === assistantId);
      
      if (foundAssistant) {
        console.log('Assistente encontrado na lista da API Vapi:', foundAssistant);
        return foundAssistant;
      }
      
      console.error('Assistente não encontrado na API Vapi');
      return null;
    } catch (error) {
      console.error('Erro ao buscar assistente da API Vapi:', error);
      return null;
    }
  },
  
  async saveAssistant(assistant: Omit<Assistant, 'id' | 'created_at'>): Promise<Assistant | null> {
    try {
      console.log('Salvando assistente:', assistant);
      
      // Garantir que assistant_id seja definido
      if (!assistant.assistant_id) {
        console.error('assistant_id é obrigatório para salvar um assistente');
        toast('Falha ao salvar assistente: ID do assistente Vapi é obrigatório');
        return null;
      }
      
      const { data, error } = await supabase
        .from('assistants')
        .insert({
          ...assistant,
          // Garantir que estamos usando o ID da Vapi como assistant_id
          assistant_id: assistant.assistant_id
        })
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
            assistant_id: data.assistant_id, // Using the VAPI assistant_id (not the Supabase id)
            assistant_name: data.name,
            timestamp: new Date().toISOString(),
            user_id: data.user_id,
            additional_data: {
              is_ready: true,
              system_prompt: data.system_prompt,
              first_message: data.first_message,
              supabase_id: data.id, // Adding the Supabase ID for reference
              model: data.model || DEFAULT_MODEL,
              voice: data.voice || DEFAULT_VOICE
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
        .eq('id', assistantId) // Using Supabase ID for updates
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
      
      // Primeiro tenta buscar no banco de dados local
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId) // Using Supabase ID for selection
        .single();
      
      if (error) {
        console.log('Assistente não encontrado no banco local, buscando na API Vapi');
        
        // Se não encontrou no banco local, tenta buscar da API Vapi
        try {
          // Primeiro, tentar buscar diretamente pelo ID
          const vapiAssistant = await this.getVapiAssistantById(assistantId);
          
          if (vapiAssistant) {
            console.log('Assistente encontrado diretamente na API Vapi:', vapiAssistant);
            toast(`Assistente "${vapiAssistant.name}" selecionado com sucesso`);
            
            // Log IDs specifically for clarity
            console.log('Assistente IDs (da API Vapi):', {
              id: vapiAssistant.id,
              assistant_id: vapiAssistant.assistant_id
            });
            
            // Save to localStorage
            localStorage.setItem('selected_assistant', JSON.stringify(vapiAssistant));
            
            return vapiAssistant;
          }
          
          // Se não encontrou pelo ID direto, buscar todos
          const vapiAssistants = await this.getVapiAssistants();
          const vapiAssistant2 = vapiAssistants.find(a => a.id === assistantId || a.assistant_id === assistantId);
          
          if (vapiAssistant2) {
            console.log('Assistente encontrado na lista da API Vapi:', vapiAssistant2);
            toast(`Assistente "${vapiAssistant2.name}" selecionado com sucesso`);
            
            // Save to localStorage
            localStorage.setItem('selected_assistant', JSON.stringify(vapiAssistant2));
            
            return vapiAssistant2;
          } else {
            console.error('Assistente não encontrado na API Vapi');
            toast(`Falha ao selecionar assistente: Não encontrado na API Vapi`);
            return null;
          }
        } catch (vapiError) {
          console.error('Erro ao buscar assistente da API Vapi:', vapiError);
          toast(`Falha ao selecionar assistente: ${error.message}`);
          return null;
        }
      }
      
      console.log('Assistente selecionado do banco local:', data);
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
      
      // Primeiro tenta buscar no banco de dados local
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .or(`id.eq.${assistantId},assistant_id.eq.${assistantId}`)  // Buscar por qualquer um dos IDs
        .single();
      
      if (error || !data) {
        console.log('Assistente não encontrado no banco local, buscando na API Vapi');
        
        // Se não encontrou no banco local, tenta buscar da API Vapi diretamente pelo ID
        try {
          const vapiAssistant = await this.getVapiAssistantById(assistantId);
          
          if (vapiAssistant) {
            console.log('Assistente encontrado diretamente na API Vapi por ID:', vapiAssistant);
            return vapiAssistant;
          }
          
          // Se não encontrou pelo ID direto, tenta buscar todos e filtrar
          const vapiAssistants = await this.getVapiAssistants();
          const matchingAssistant = vapiAssistants.find(a => 
            a.id === assistantId || a.assistant_id === assistantId
          );
          
          if (matchingAssistant) {
            console.log('Assistente encontrado na lista completa da API Vapi:', matchingAssistant);
            return matchingAssistant;
          } else {
            console.error('Assistente não encontrado na API Vapi');
            return null;
          }
        } catch (vapiError) {
          console.error('Erro ao buscar assistente da API Vapi:', vapiError);
          return null;
        }
      }
      
      console.log('Assistente encontrado no banco local:', data);
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
      
      // Log both IDs for debugging
      if (assistant) {
        console.log('Assistente IDs (do localStorage):', {
          supabaseId: assistant.id,
          vapiId: assistant.assistant_id
        });
      }
      
      return assistant;
    } catch (error) {
      console.error('Erro ao recuperar assistente do localStorage:', error);
      return null;
    }
  },
  
  async ensureVapiAssistantId(assistantIdOrObj: string | Assistant | null | undefined): Promise<string | null> {
    if (!assistantIdOrObj) return null;
    
    let assistantId: string | null = null;
    let assistant: Assistant | null = null;
    
    // Se for um objeto, extrair o ID
    if (typeof assistantIdOrObj === 'object') {
      assistant = assistantIdOrObj;
      // Preferir o assistant_id se disponível (deve ser o ID da Vapi)
      assistantId = assistant.assistant_id || assistant.id;
    } else {
      // Se for uma string, usar diretamente
      assistantId = assistantIdOrObj;
    }
    
    if (!assistantId) return null;
    
    // Verificar se o ID já é da Vapi
    try {
      // Tentar buscar diretamente da API Vapi para confirmar
      const vapiAssistant = await this.getVapiAssistantById(assistantId);
      if (vapiAssistant) {
        console.log('ID já é da Vapi, confirmado:', assistantId);
        return assistantId;
      }
      
      // Se não encontrou diretamente, pode ser um ID do Supabase
      // Então tentamos buscar no banco para obter o assistant_id
      if (!assistant) {
        assistant = await this.getAssistantById(assistantId);
      }
      
      if (assistant && assistant.assistant_id) {
        console.log('Obtido ID da Vapi a partir do banco:', assistant.assistant_id);
        return assistant.assistant_id;
      }
      
      // Se ainda não encontrou, buscar todos os assistentes como último recurso
      const allVapiAssistants = await this.getVapiAssistants();
      const matchingAssistant = allVapiAssistants.find(a => 
        a.id === assistantId || a.assistant_id === assistantId
      );
      
      if (matchingAssistant) {
        console.log('Encontrado assistente na lista completa da Vapi:', matchingAssistant.id);
        return matchingAssistant.id;
      }
      
      // Tentar buscar pelo nome se o ID não for encontrado
      if (assistant && assistant.name) {
        const idByName = await this.getVapiAssistantIdByName(assistant.name);
        if (idByName) {
          console.log('Encontrado ID via nome do assistente:', idByName);
          return idByName;
        }
      }
      
      console.warn('Não foi possível encontrar um ID Vapi válido para:', assistantId);
      return null;
    } catch (error) {
      console.error('Erro ao garantir ID da Vapi:', error);
      return assistantId; // Retornar o ID original como fallback
    }
  }
};

export default assistantService;
