
import { supabase } from '@/lib/supabase';
import { formatPhoneNumber, isValidBrazilianPhoneNumber } from '@/lib/utils';

export type Client = {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  account_id?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
};

export const clientService = {
  // Buscar todos os clientes do usuário atual
  async getClients() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        console.error("Usuário não autenticado ao buscar clientes");
        return [];
      }

      console.log("Buscando clientes para o usuário:", userId);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error("Error fetching clients:", error);
        throw new Error(`Erro ao buscar clientes: ${error.message}`);
      }

      console.log(`Encontrados ${data?.length || 0} clientes para o usuário ${userId}`);
      return data || [];
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      throw error;
    }
  },

  // Buscar todos os clientes de uma conta específica
  async getClientsByAccount(accountId: string) {
    console.log(`Buscando clientes para a conta: ${accountId}`);
    
    if (!accountId) {
      throw new Error('ID da conta é obrigatório');
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        console.error("Usuário não autenticado ao buscar clientes por conta");
        return [];
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (error) {
        console.error(`Error fetching clients for account ${accountId}:`, error);
        throw new Error(`Erro ao buscar clientes da conta: ${error.message}`);
      }

      console.log(`Encontrados ${data?.length || 0} clientes para a conta ${accountId}`);
      return data || [];
    } catch (error) {
      console.error("Erro ao buscar clientes por conta:", error);
      throw error;
    }
  },

  // Buscar um cliente por ID
  async getClientById(id: number) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        console.error("Usuário não autenticado ao buscar cliente por ID");
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar cliente: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Erro ao buscar cliente por ID:", error);
      throw error;
    }
  },

  // Adicionar um novo cliente
  async addClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // Se o user_id não foi fornecido, buscá-lo
      if (!client.user_id) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          throw new Error('Usuário não autenticado');
        }
        client.user_id = userData.user.id;
      }
      
      console.log("Adicionando cliente com user_id:", client.user_id);
      
      // Formatar o telefone antes de salvar
      const formattedPhone = formatPhoneNumber(client.phone);
      
      // Verificar se o telefone é válido
      if (!isValidBrazilianPhoneNumber(formattedPhone)) {
        throw new Error('Número de telefone inválido. Use formato: DDD + número (exemplo: 85997484924)');
      }
      
      const formattedClient = {
        ...client,
        phone: formattedPhone
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(formattedClient)
        .select();

      if (error) {
        console.error("Erro ao inserir cliente:", error);
        throw new Error(`Erro ao adicionar cliente: ${error.message}`);
      }

      console.log("Cliente adicionado com sucesso:", data);
      return data;
    } catch (error) {
      console.error("Erro em addClient:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Erro ao adicionar cliente: ${String(error)}`);
    }
  },

  // Adicionar um cliente e associá-lo a um grupo
  async addClientWithGroup(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>, groupId: string) {
    try {
      // Se o user_id não foi fornecido, buscá-lo
      if (!client.user_id) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          throw new Error('Usuário não autenticado');
        }
        client.user_id = userData.user.id;
      }
      
      console.log("Adicionando cliente em grupo com user_id:", client.user_id);
      
      // Formatar o telefone antes de salvar
      const formattedPhone = formatPhoneNumber(client.phone);
      
      // Verificar se o telefone é válido
      if (!isValidBrazilianPhoneNumber(formattedPhone)) {
        throw new Error('Número de telefone inválido. Use formato: DDD + número (exemplo: 85997484924)');
      }
      
      const formattedClient = {
        ...client,
        phone: formattedPhone
      };
      
      // Primeiro adiciona o cliente
      const { data, error } = await supabase
        .from('clients')
        .insert(formattedClient)
        .select();

      if (error) {
        console.error("Erro ao inserir cliente com grupo:", error);
        throw new Error(`Erro ao adicionar cliente: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('Erro ao adicionar cliente: Nenhum dado retornado');
      }
      
      const newClient = data[0];
      console.log("Cliente adicionado com sucesso:", newClient);
      
      // Se um grupo foi especificado, adiciona o cliente ao grupo
      if (groupId && groupId !== 'none') {
        // Converter o groupId para number se necessário
        const numericGroupId = typeof groupId === 'string' && !isNaN(parseInt(groupId)) 
          ? parseInt(groupId) 
          : groupId;
          
        const { error: groupError } = await supabase
          .from('client_group_members')
          .insert({
            client_id: newClient.id,
            group_id: numericGroupId
          });
          
        if (groupError) {
          console.error('Erro ao adicionar cliente ao grupo:', groupError);
          // Não falha a operação principal se a associação com o grupo falhar
        } else {
          console.log(`Cliente ${newClient.id} adicionado ao grupo ${numericGroupId}`);
        }
      }

      return newClient;
    } catch (error) {
      console.error('Erro em addClientWithGroup:', error);
      throw error;
    }
  },

  async updateClient(id: number, client: Partial<Client>) {
    try {
      const updatedClient = { ...client };
      
      // Se telefone estiver sendo atualizado, formatá-lo
      if (updatedClient.phone) {
        const formattedPhone = formatPhoneNumber(updatedClient.phone);
        
        // Verificar se o telefone é válido
        if (!isValidBrazilianPhoneNumber(formattedPhone)) {
          throw new Error('Número de telefone inválido. Use formato: DDD + número (exemplo: 85997484924)');
        }
        
        updatedClient.phone = formattedPhone;
      }
      
      const { data, error } = await supabase
        .from('clients')
        .update(updatedClient)
        .eq('id', id)
        .select();

      if (error) {
        console.error("Erro ao atualizar cliente:", error);
        throw new Error(`Erro ao atualizar cliente: ${error.message}`);
      }

      console.log("Cliente atualizado com sucesso:", data);
      return data;
    } catch (error) {
      console.error("Erro em updateClient:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Erro ao atualizar cliente: ${String(error)}`);
    }
  },

  // Excluir um cliente
  async deleteClient(id: number) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error("Erro ao excluir cliente:", error);
        throw new Error(`Erro ao excluir cliente: ${error.message}`);
      }

      console.log("Cliente excluído com sucesso:", data);
      return data;
    } catch (error) {
      console.error("Erro em deleteClient:", error);
      throw error;
    }
  },

  // Obter estatísticas dos clientes
  async getClientStats() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        console.log("Usuário não autenticado ao buscar estatísticas");
        return {
          totalClients: 0,
          activeClients: 0,
        };
      }

      const { data: allClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, status')
        .eq('user_id', userId);

      if (clientsError) {
        console.error("Error fetching client stats:", clientsError);
        throw new Error(`Erro ao buscar estatísticas: ${clientsError.message}`);
      }

      const totalClients = allClients?.length || 0;
      const activeClients = allClients?.filter(client => client.status === 'Active')?.length || 0;

      return {
        totalClients,
        activeClients,
      };
    } catch (error) {
      console.error("Error in getClientStats:", error);
      return {
        totalClients: 0,
        activeClients: 0,
      };
    }
  },

  // Buscar clientes por grupo
  async getClientsByGroupId(groupId: string) {
    try {
      // Converter o groupId para number se necessário
      const numericGroupId = typeof groupId === 'string' && !isNaN(parseInt(groupId)) 
        ? parseInt(groupId) 
        : groupId;
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) {
        console.log("Usuário não autenticado ao buscar clientes por grupo");
        return [];
      }
      
      console.log(`Buscando clientes para o grupo: ${numericGroupId} (usuário: ${userId})`);
      
      const { data, error } = await supabase
        .from('client_group_members')
        .select(`
          client_id,
          clients(*)
        `)
        .eq('group_id', numericGroupId);

      if (error) {
        console.error("Erro ao buscar clientes por grupo:", error);
        throw new Error(`Erro ao buscar clientes por grupo: ${error.message}`);
      }

      const clients = data
        .map(item => {
          if (item.clients && typeof item.clients === 'object') {
            return item.clients as unknown as Client;
          }
          return null;
        })
        .filter((client): client is Client => client !== null && client.user_id === userId);

      console.log(`Encontrados ${clients.length} clientes para o grupo ${numericGroupId}`);
      return clients;
    } catch (error) {
      console.error("Erro ao buscar clientes por grupo:", error);
      throw error;
    }
  },

  // Importar clientes de uma planilha
  async importClients(clients: Omit<Client, 'id' | 'created_at' | 'updated_at'>[]) {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(`Erro ao obter usuário: ${userError.message}`);

      const userId = userData?.user?.id;
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      // Formatar o telefone de cada cliente antes de salvar
      const formattedClients = clients.map(client => ({
        ...client,
        phone: formatPhoneNumber(client.phone),
        user_id: userId,
      }));

      console.log(`Importando ${formattedClients.length} clientes para o usuário ${userId}`);
      
      const { data, error } = await supabase
        .from('clients')
        .insert(formattedClients)
        .select();

      if (error) {
        console.error("Erro ao importar clientes:", error);
        throw new Error(`Erro ao importar clientes: ${error.message}`);
      }

      console.log(`${data?.length || 0} clientes importados com sucesso`);
      return data as Client[];
    } catch (error) {
      console.error("Erro em importClients:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Erro ao importar clientes: ${String(error)}`);
    }
  },
};
