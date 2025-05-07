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

// Default model and voice
const DEFAULT_MODEL = "gpt-4o-turbo";
const DEFAULT_VOICE = "eleven_labs_gemma";

// Vapi API Key
const VAPI_API_KEY = "fa59de39-766b-437d-9d9d-2191e00e6e21";

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
        id: assistant.id, 
        name: assistant.name,
        assistant_id: assistant.id,
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

  // Verificar se um ID Vapi é válido
  async validateVapiAssistantId(assistantId: string): Promise<boolean> {
    try {
      console.log(`Validando ID do assistente Vapi: ${assistantId}`);
      
      // Verificar se é um UUID válido
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(assistantId)) {
        console.log('ID não é um UUID válido:', assistantId);
        return false;
      }
      
      const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('ID Vapi validado com sucesso:', assistantId);
        return true;
      } else {
        console.log('ID Vapi inválido:', assistantId);
        return false;
      }
    } catch (error) {
      console.error('Erro ao validar ID do assistente Vapi:', error);
      return false;
    }
  },

  // Obter ID do assistente da Vapi pelo nome
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
      // Verificar se o ID é realmente da Vapi API
      const vapiId = await this.ensureVapiAssistantId(assistant.assistant_id);
      if (!vapiId) {
        console.error('Não foi possível confirmar o ID do assistente na Vapi API');
        toast('Falha ao salvar assistente: ID do assistente Vapi não confirmado');
        return null;
      }
      // Atualizar o assistant_id com o ID confirmado da Vapi
      const assistantToSave = {
        ...assistant,
        assistant_id: vapiId
      };
      const { data, error } = await supabase
        .from('assistants')
        .insert(assistantToSave)
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
      // Notificar o webhook SEMPRE com o ID real da Vapi
      try {
        await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assistant_created',
            assistant_id: vapiId,
            timestamp: new Date().toISOString(),
            user_id: data.user_id,
            additional_data: {
              is_ready: true,
              system_prompt: data.system_prompt,
              first_message: data.first_message,
              supabase_id: data.id,
              model: data.model || DEFAULT_MODEL,
              voice: data.voice || DEFAULT_VOICE,
              vapi_status: 'ready',
              vapi_created_at: data.created_at
            }
          }),
        });
        console.log('Webhook chamado com o ID real da Vapi (saveAssistant)');
      } catch (webhookError) {
        console.error('Erro ao notificar webhook (saveAssistant):', webhookError);
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
      // Se o update contém assistant_id, verificar se é um ID válido da Vapi
      if (updates.assistant_id) {
        const vapiId = await this.ensureVapiAssistantId(updates.assistant_id);
        if (vapiId && vapiId !== updates.assistant_id) {
          console.log(`Atualizando assistant_id de ${updates.assistant_id} para ${vapiId}`);
          updates.assistant_id = vapiId;
        }
      }
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
      // Notificar o webhook SEMPRE com o ID real da Vapi
      try {
        const vapiId = await this.ensureVapiAssistantId(data.assistant_id);
        await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assistant_updated',
            assistant_id: vapiId,
            timestamp: new Date().toISOString(),
            user_id: data.user_id,
            additional_data: {
              is_ready: true,
              supabase_id: data.id,
              model: data.model || DEFAULT_MODEL,
              voice: data.voice || DEFAULT_VOICE,
              vapi_status: 'ready',
              updated_fields: Object.keys(updates)
            }
          }),
        });
        console.log('Webhook chamado com o ID real da Vapi (updateAssistant)');
      } catch (webhookError) {
        console.error('Erro ao notificar webhook (updateAssistant):', webhookError);
      }
      return data;
    } catch (error) {
      console.error('Erro em updateAssistant:', error);
      toast('Falha ao atualizar assistente');
      return null;
    }
  },


    // Completely rewritten findVapiAssistantId method with better detection and logging
    async findVapiAssistantId(localAssistantId: string, assistantName?: string, userId?: string): Promise<string | null> {
      if (!localAssistantId) {
        console.error('Cannot find Vapi assistant: No local ID provided');
        return null;
      }
      
      console.log(`🔍 Starting lookup for Vapi assistant ID from local ID: ${localAssistantId}`);
      
      try {
        // Step 1: Try to validate if the localAssistantId is already a valid Vapi ID
        const isAlreadyValidVapiId = await this.validateVapiAssistantId(localAssistantId);
        if (isAlreadyValidVapiId) {
          console.log(`✅ Local ID is directly valid as a Vapi ID: ${localAssistantId}`);
          return localAssistantId;
        }
        
        // Step 2: Get the local assistant details if available
        let localAssistant = null;
        try {
          const { data } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', localAssistantId)
            .single();
          
          if (data) {
            localAssistant = data;
            console.log(`📄 Found local assistant details: ${data.name} (${data.id})`);
            
            // If it has an assistant_id field, try that directly
            if (data.assistant_id) {
              const isValid = await this.validateVapiAssistantId(data.assistant_id);
              if (isValid) {
                console.log(`✅ Found valid Vapi ID from assistant_id field: ${data.assistant_id}`);
                return data.assistant_id;
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Could not fetch local assistant details, continuing with search');
        }
        
        // Step 3: Fetch all Vapi assistants for matching
        console.log('📚 Fetching all assistants from Vapi API for matching...');
        const vapiAssistants = await this.getVapiAssistants();
        
        if (!vapiAssistants || vapiAssistants.length === 0) {
          console.error('❌ No assistants found in Vapi API');
          return null;
        }
        
        console.log(`📊 Found ${vapiAssistants.length} assistants in Vapi API`);
        
        // Step 4: Try to match by metadata.supabase_id (most reliable)
        const matchBySupabaseId = vapiAssistants.find(va => 
          va.metadata?.supabase_id === localAssistantId
        );
        
        if (matchBySupabaseId) {
          console.log(`✅ Found exact match by metadata.supabase_id: ${matchBySupabaseId.id}`);
          return matchBySupabaseId.id;
        }
        
        // Step 5: If we have local assistant details, try various matching strategies
        if (localAssistant) {
          // Get name from local assistant or passed parameter
          const name = localAssistant.name || assistantName;
          const userIdToMatch = localAssistant.user_id || userId;
          
          if (name && userIdToMatch) {
            // Try matching by both user_id AND name (more specific)
            const matchByUserAndName = vapiAssistants.find(va => 
              va.metadata?.user_id === userIdToMatch && 
              va.name === name
            );
            
            if (matchByUserAndName) {
              console.log(`✅ Found match by user_id and name: ${matchByUserAndName.id}`);
              return matchByUserAndName.id;
            }
          }
          
          // Try matching by timestamp if available
          if (localAssistant.created_at) {
            console.log(`🕒 Attempting to match by creation timestamp: ${localAssistant.created_at}`);
            const localTimestamp = new Date(localAssistant.created_at).getTime();
            
            let closestAssistant = null;
            let smallestTimeDiff = Infinity;
            
            // Find assistants with the same name and closest creation time
            vapiAssistants.forEach(va => {
              if (name && va.name === name && va.metadata?.created_at) {
                const vapiTimestamp = new Date(va.metadata.created_at).getTime();
                const timeDiff = Math.abs(vapiTimestamp - localTimestamp);
                
                if (timeDiff < smallestTimeDiff) {
                  smallestTimeDiff = timeDiff;
                  closestAssistant = va;
                }
              }
            });
            
            // Consider it a match if within 24 hours (86400000 ms)
            if (closestAssistant && smallestTimeDiff < 86400000) {
              console.log(`✅ Found match by name and closest creation time (${smallestTimeDiff}ms difference): ${closestAssistant.id}`);
              return closestAssistant.id;
            }
          }
        }
        
        // Step 6: Try matching just by name as a fallback
        if (assistantName || (localAssistant && localAssistant.name)) {
          const nameToMatch = assistantName || (localAssistant ? localAssistant.name : '');
          console.log(`🔤 Attempting to match by name: "${nameToMatch}"`);
          
          // Find all matches by name (case insensitive)
          const nameMatches = vapiAssistants.filter(va => 
            va.name.toLowerCase() === nameToMatch.toLowerCase()
          );
          
          if (nameMatches.length === 1) {
            console.log(`✅ Found single match by name: ${nameMatches[0].id}`);
            return nameMatches[0].id;
          } else if (nameMatches.length > 1) {
            console.log(`⚠️ Found ${nameMatches.length} assistants with name "${nameToMatch}" - trying to narrow down`);
            
            // If multiple matches, try to find one with the matching user_id
            if (userId || (localAssistant && localAssistant.user_id)) {
              const userIdToMatch = userId || (localAssistant ? localAssistant.user_id : '');
              const userMatch = nameMatches.find(va => va.metadata?.user_id === userIdToMatch);
              
              if (userMatch) {
                console.log(`✅ Narrowed down to single assistant by user_id among name matches: ${userMatch.id}`);
                return userMatch.id;
              }
            }
            
            // If still no unique match, use the first one but log a warning
            console.warn(`⚠️ Multiple assistants with name "${nameToMatch}" found. Using the first one: ${nameMatches[0].id}`);
            return nameMatches[0].id;
          }
        }
        
        // Step 7: As a last resort, try partial name matching
        if (assistantName || (localAssistant && localAssistant.name)) {
          const nameToMatch = assistantName || (localAssistant ? localAssistant.name : '');
          console.log(`🔍 Attempting partial name matching for: "${nameToMatch}"`);
          
          // Find any assistant with a partially matching name
          const partialMatch = vapiAssistants.find(va => 
            va.name.toLowerCase().includes(nameToMatch.toLowerCase()) ||
            nameToMatch.toLowerCase().includes(va.name.toLowerCase())
          );
          
          if (partialMatch) {
            console.log(`⚠️ Found partial name match: "${partialMatch.name}" (${partialMatch.id})`);
            return partialMatch.id;
          }
        }
        
        // If we got here, we couldn't find a match
        console.error(`❌ Could not find any matching Vapi assistant for ID: ${localAssistantId}`);
        return null;
      } catch (error) {
        console.error('❌ Error in findVapiAssistantId:', error);
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
        .eq('id', assistantId)
        .single();
      if (error) {
        console.log('Assistente não encontrado no banco local, buscando na API Vapi');
        // Se não encontrou no banco local, tenta buscar da API Vapi
        try {
          // Verificar se o ID fornecido é um ID Vapi válido
          const vapiId = await this.ensureVapiAssistantId(assistantId);
          if (!vapiId) {
            console.error('Não foi possível encontrar um ID Vapi válido para:', assistantId);
            toast(`Falha ao selecionar assistente: ID inválido`);
            return null;
          }
          // Buscar assistente usando o ID válido da Vapi
          const vapiAssistant = await this.getVapiAssistantById(vapiId);
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
            // Notificar webhook SEMPRE com o ID real da Vapi
            try {
              await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'assistant_selected',
                  assistant_id: vapiId,
                  timestamp: new Date().toISOString(),
                  user_id: vapiAssistant.user_id,
                  additional_data: {
                    is_ready: true,
                    model: vapiAssistant.model || DEFAULT_MODEL,
                    voice: vapiAssistant.voice || DEFAULT_VOICE,
                    source: 'vapi_api'
                  }
                }),
              });
              console.log('Webhook chamado com o ID real da Vapi (selectAssistant)');
            } catch (webhookError) {
              console.error('Erro ao notificar webhook (selectAssistant):', webhookError);
            }
            return vapiAssistant;
          }
          console.error('Assistente não encontrado na API Vapi');
          toast(`Falha ao selecionar assistente: Não encontrado na API Vapi`);
          return null;
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
      // Verificar se o ID da Vapi está correto
      const vapiId = await this.ensureVapiAssistantId(data.assistant_id);
      if (vapiId && vapiId !== data.assistant_id) {
        console.log(`ID da Vapi atualizado de ${data.assistant_id} para ${vapiId}`);
        // Atualizar o ID no banco de dados silenciosamente
        this.updateAssistant(data.id, { assistant_id: vapiId });
        data.assistant_id = vapiId;
      }
      // Save to localStorage for compatibility with existing code
      localStorage.setItem('selected_assistant', JSON.stringify(data));
      // Notificar webhook SEMPRE com o ID real da Vapi
      try {
        await fetch('https://primary-production-31de.up.railway.app/webhook/collowop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assistant_selected',
            assistant_id: vapiId,
            timestamp: new Date().toISOString(),
            user_id: data.user_id,
            additional_data: {
              is_ready: true,
              supabase_id: data.id,
              model: data.model || DEFAULT_MODEL,
              voice: data.voice || DEFAULT_VOICE,
              source: 'supabase'
            }
          }),
        });
        console.log('Webhook chamado com o ID real da Vapi (selectAssistant)');
      } catch (webhookError) {
        console.error('Erro ao notificar webhook (selectAssistant):', webhookError);
      }
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
        
        // Verificar se o ID fornecido é um ID Vapi válido
        const vapiId = await this.ensureVapiAssistantId(assistantId);
        if (!vapiId) {
          // Tentar buscar por nome se o ID não for reconhecido
          if (typeof assistantId === 'string' && !assistantId.match(/^[0-9a-f-]+$/i)) {
            const idByName = await this.getVapiAssistantIdByName(assistantId);
            if (idByName) {
              console.log(`Encontrado ID via nome do assistente: ${idByName}`);
              return this.getVapiAssistantById(idByName);
            }
          }
          
          console.error('Não foi possível encontrar um ID Vapi válido para:', assistantId);
          return null;
        }
        
        // Buscar assistente usando o ID válido da Vapi
        return await this.getVapiAssistantById(vapiId);
      }
      
      console.log('Assistente encontrado no banco local:', data);
      console.log('First message do assistente:', data.first_message || 'NÃO ENCONTRADA');
      
      // Verificar se o ID da Vapi está correto
      const vapiId = await this.ensureVapiAssistantId(data.assistant_id);
      if (vapiId && vapiId !== data.assistant_id) {
        console.log(`ID da Vapi atualizado de ${data.assistant_id} para ${vapiId}`);
        // Atualizar o ID no banco de dados silenciosamente
        this.updateAssistant(data.id, { assistant_id: vapiId });
        data.assistant_id = vapiId;
      }
      
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
      const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('ID já é da Vapi, confirmado:', assistantId);
        return assistantId;
      }
      
      // Se não encontrou diretamente, pode ser um ID do Supabase
      // Então tentamos buscar no banco para obter o assistant_id
      if (!assistant) {
        const { data } = await supabase
          .from('assistants')
          .select('assistant_id')
          .eq('id', assistantId)
          .single();
          
        if (data && data.assistant_id) {
          console.log('Obtido ID da Vapi a partir do banco:', data.assistant_id);
          
          // Verificar se este ID é válido na Vapi
          const vapiCheckResponse = await fetch(`https://api.vapi.ai/assistant/${data.assistant_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (vapiCheckResponse.ok) {
            return data.assistant_id;
          }
        }
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
      return null; // Em caso de erro, retornar null para forçar tratamento adequado
    }
  }
};

export default assistantService;
