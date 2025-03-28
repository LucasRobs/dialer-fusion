
import { supabase } from '@/lib/supabase';
import { webhookService } from './webhookService';

// Interface para os dados da campanha
export interface Campaign {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  client_count?: number;
  call_count?: number;
  success_rate?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Interface para os dados do cliente da campanha
export interface CampaignClient {
  id: number;
  campaign_id: number;
  client_id: number;
  status: 'pending' | 'called' | 'completed' | 'failed' | 'scheduled';
  call_date?: string;
  call_duration?: number;
  call_record_url?: string;
  call_transcript?: string;
  call_summary?: string;
  notes?: string;
}

// Serviço para gerenciar as campanhas
const campaignService = {
  // Função para obter todas as campanhas
  async getAllCampaigns(): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_clients:campaign_clients(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        throw new Error('Failed to fetch campaigns');
      }

      const campaigns = data.map(item => {
        const campaign: Campaign = {
          id: item.id,
          name: item.name,
          description: item.description,
          start_date: item.start_date,
          end_date: item.end_date,
          status: item.status,
          client_count: item.campaign_clients[0]?.count || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
          user_id: item.user_id,
        };
        return campaign;
      });

      return campaigns;
    } catch (error) {
      console.error('Error in getAllCampaigns:', error);
      throw error;
    }
  },

  // Função para obter uma campanha específica por ID
  async getCampaignById(id: number): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching campaign by ID:', error);
        throw new Error('Failed to fetch campaign');
      }

      return data;
    } catch (error) {
      console.error('Error in getCampaignById:', error);
      throw error;
    }
  },

  // Função para criar uma nova campanha
  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign> {
    try {
      // Verifica se status está definido, se não, define como "draft"
      if (!campaign.status) {
        campaign.status = 'draft';
      }

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign:', error);
        throw new Error('Failed to create campaign');
      }

      return data;
    } catch (error) {
      console.error('Error in createCampaign:', error);
      throw error;
    }
  },

  // Função para atualizar uma campanha existente
  async updateCampaign(id: number, campaign: Partial<Campaign>): Promise<Campaign> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .update(campaign)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating campaign:', error);
        throw new Error('Failed to update campaign');
      }

      return data;
    } catch (error) {
      console.error('Error in updateCampaign:', error);
      throw error;
    }
  },

  // Função para excluir uma campanha
  async deleteCampaign(id: number): Promise<void> {
    try {
      // Primeiro exclui todos os clientes associados à campanha
      const { error: clientsError } = await supabase
        .from('campaign_clients')
        .delete()
        .eq('campaign_id', id);

      if (clientsError) {
        console.error('Error deleting campaign clients:', clientsError);
        throw new Error('Failed to delete campaign clients');
      }

      // Depois exclui a campanha
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting campaign:', error);
        throw new Error('Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error in deleteCampaign:', error);
      throw error;
    }
  },

  // Função para obter os clientes de uma campanha específica
  async getCampaignClients(campaignId: number): Promise<CampaignClient[]> {
    try {
      const { data, error } = await supabase
        .from('campaign_clients')
        .select(`
          *,
          clients:client_id(id, name, phone, email)
        `)
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('Error fetching campaign clients:', error);
        throw new Error('Failed to fetch campaign clients');
      }

      return data.map(item => ({
        id: item.id,
        campaign_id: item.campaign_id,
        client_id: item.client_id,
        status: item.status,
        call_date: item.call_date,
        call_duration: item.call_duration,
        call_record_url: item.call_record_url,
        call_transcript: item.call_transcript,
        call_summary: item.call_summary,
        notes: item.notes,
        client_name: item.clients.name,
        client_phone: item.clients.phone,
        client_email: item.clients.email
      }));
    } catch (error) {
      console.error('Error in getCampaignClients:', error);
      throw error;
    }
  },

  // Função para adicionar clientes a uma campanha
  async addClientsToCampaign(campaignId: number, clientIds: number[]): Promise<void> {
    try {
      // Verifica se já existem clientes na campanha
      const { data: existingClients, error: checkError } = await supabase
        .from('campaign_clients')
        .select('client_id')
        .eq('campaign_id', campaignId);

      if (checkError) {
        console.error('Error checking existing campaign clients:', checkError);
        throw new Error('Failed to check existing campaign clients');
      }

      // Filtra apenas os clientes que ainda não estão na campanha
      const existingClientIds = existingClients.map(client => client.client_id);
      const newClientIds = clientIds.filter(id => !existingClientIds.includes(id));

      if (newClientIds.length === 0) {
        console.log('No new clients to add to the campaign');
        return;
      }

      // Prepara os dados para inserção
      const clientsToAdd = newClientIds.map(clientId => ({
        campaign_id: campaignId,
        client_id: clientId,
        status: 'pending'
      }));

      // Adiciona os clientes à campanha
      const { error } = await supabase
        .from('campaign_clients')
        .insert(clientsToAdd);

      if (error) {
        console.error('Error adding clients to campaign:', error);
        throw new Error('Failed to add clients to campaign');
      }
    } catch (error) {
      console.error('Error in addClientsToCampaign:', error);
      throw error;
    }
  },

  // Função para remover clientes de uma campanha
  async removeClientsFromCampaign(campaignId: number, clientIds: number[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaign_clients')
        .delete()
        .eq('campaign_id', campaignId)
        .in('client_id', clientIds);

      if (error) {
        console.error('Error removing clients from campaign:', error);
        throw new Error('Failed to remove clients from campaign');
      }
    } catch (error) {
      console.error('Error in removeClientsFromCampaign:', error);
      throw error;
    }
  },

  // Função para iniciar uma campanha
  async startCampaign(campaignId: number): Promise<void> {
    try {
      // Primeiro, atualiza o status da campanha para "active"
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);

      if (updateError) {
        console.error('Error updating campaign status:', updateError);
        throw new Error('Failed to update campaign status');
      }

      // Prepara e envia as ligações para os clientes da campanha
      const result = await webhookService.prepareBulkCallsForCampaign(campaignId);
      
      if (!result.success) {
        console.error('Failed to prepare calls for campaign', result);
        throw new Error(`Failed to prepare calls for campaign: ${result.failedCalls} failed calls`);
      }
      
      console.log('Campaign started successfully', result);
    } catch (error) {
      console.error('Error in startCampaign:', error);
      throw error;
    }
  },

  // Função para pausar uma campanha
  async pauseCampaign(campaignId: number): Promise<void> {
    try {
      // Atualiza o status da campanha para "paused"
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      if (error) {
        console.error('Error pausing campaign:', error);
        throw new Error('Failed to pause campaign');
      }
    } catch (error) {
      console.error('Error in pauseCampaign:', error);
      throw error;
    }
  },

  // Função para obter estatísticas da campanha
  async getCampaignStats(campaignId: number): Promise<any> {
    try {
      // Obtem os clientes da campanha com seus status
      const { data: clients, error } = await supabase
        .from('campaign_clients')
        .select('status, call_duration')
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('Error fetching campaign stats:', error);
        throw new Error('Failed to fetch campaign stats');
      }

      // Calcula as estatísticas
      const total = clients.length;
      const pending = clients.filter(client => client.status === 'pending').length;
      const called = clients.filter(client => client.status === 'called').length;
      const completed = clients.filter(client => client.status === 'completed').length;
      const failed = clients.filter(client => client.status === 'failed').length;

      // Calcula a duração média das chamadas (em segundos)
      const callDurations = clients
        .filter(client => client.call_duration !== null && client.call_duration !== undefined)
        .map(client => client.call_duration as number);
      
      const avgDuration = callDurations.length > 0 
        ? callDurations.reduce((sum, duration) => sum + duration, 0) / callDurations.length 
        : 0;

      // Calcula a taxa de sucesso (chamadas completadas / total de chamadas)
      const successRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total,
        pending,
        called,
        completed,
        failed,
        avgDuration,
        successRate
      };
    } catch (error) {
      console.error('Error in getCampaignStats:', error);
      throw error;
    }
  },

  // Função para obter dados para o histórico de ligações
  async getCallHistory(limit: number = 20): Promise<any[]> {
    try {
      // Obtem um histórico de ligações recentes
      const { data, error } = await supabase
        .from('campaign_clients')
        .select(`
          id,
          campaign_id,
          client_id,
          status,
          call_date,
          call_duration,
          call_record_url,
          call_summary,
          campaigns:campaign_id(name),
          clients:client_id(id, name, phone, email)
        `)
        .not('call_date', 'is', null)
        .order('call_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching call history:', error);
        throw new Error('Failed to fetch call history');
      }

      return data.map(item => ({
        id: item.id,
        campaign_id: item.campaign_id,
        campaign_name: item.campaigns ? item.campaigns.name : 'Desconhecido',
        client_id: item.client_id,
        client_name: item.clients ? item.clients.name : 'Desconhecido',
        client_phone: item.clients ? item.clients.phone : '',
        client_email: item.clients ? item.clients.email : '',
        status: item.status,
        call_date: item.call_date,
        call_duration: item.call_duration,
        call_record_url: item.call_record_url,
        call_summary: item.call_summary
      }));
    } catch (error) {
      console.error('Error in getCallHistory:', error);
      throw error;
    }
  },

  // Função para obter a próxima campanha ativa
  async getNextActiveCampaign(): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .order('start_date', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 é o código para "nenhum resultado encontrado" no modo single
          return null;
        }
        console.error('Error fetching next active campaign:', error);
        throw new Error('Failed to fetch next active campaign');
      }

      return data;
    } catch (error) {
      console.error('Error in getNextActiveCampaign:', error);
      throw error;
    }
  }
};

export default campaignService;
