
import { supabase } from '@/lib/supabase';

export type Campaign = {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'stopped';
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  total_calls: number;
  answered_calls: number;
  average_duration?: number;
  user_id?: string;
};

export type CampaignClient = {
  id: number;
  campaign_id: number;
  client_id: number;
  status: 'pending' | 'called' | 'answered' | 'failed';
  call_duration?: number;
  call_timestamp?: string;
  created_at?: string;
  updated_at?: string;
};

export const campaignService = {
  // Buscar todas as campanhas
  async getCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Campaign[];
  },

  // Buscar campanhas ativas
  async getActiveCampaigns() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Campaign[];
  },

  // Buscar uma campanha por ID
  async getCampaignById(id: number) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Campaign;
  },

  // Criar uma nova campanha
  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{ ...campaign, user_id: (await supabase.auth.getUser()).data.user?.id }])
      .select();
    
    if (error) throw error;
    return data[0] as Campaign;
  },

  // Atualizar uma campanha
  async updateCampaign(id: number, campaign: Partial<Campaign>) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(campaign)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as Campaign;
  },

  // Adicionar clientes a uma campanha
  async addClientsToCampaign(campaignId: number, clientIds: number[]) {
    const campaignClients = clientIds.map(clientId => ({
      campaign_id: campaignId,
      client_id: clientId,
      status: 'pending'
    }));

    const { data, error } = await supabase
      .from('campaign_clients')
      .insert(campaignClients)
      .select();
    
    if (error) throw error;
    return data as CampaignClient[];
  },

  // Buscar clientes de uma campanha
  async getCampaignClients(campaignId: number) {
    const { data, error } = await supabase
      .from('campaign_clients')
      .select(`
        *,
        clients:client_id(id, name, phone, email, status)
      `)
      .eq('campaign_id', campaignId);
    
    if (error) throw error;
    return data;
  },

  // Atualizar o status de um cliente na campanha
  async updateCampaignClientStatus(id: number, status: CampaignClient['status'], callDuration?: number) {
    const { data, error } = await supabase
      .from('campaign_clients')
      .update({
        status,
        call_duration: callDuration,
        call_timestamp: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as CampaignClient;
  },
  
  // Obter estatísticas de campanhas
  async getCampaignStats() {
    // Estatísticas de ligações recentes
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id,
        total_calls,
        answered_calls,
        average_duration,
        status
      `);
    
    if (campaignError) throw campaignError;
    
    // Total de ligações feitas
    const totalCalls = campaignData?.reduce((acc, campaign) => acc + (campaign.total_calls || 0), 0) || 0;
    
    // Ligações atendidas
    const answeredCalls = campaignData?.reduce((acc, campaign) => acc + (campaign.answered_calls || 0), 0) || 0;
    
    // Calcular duração média
    const totalDuration = campaignData?.reduce((acc, campaign) => {
      if (campaign.average_duration && campaign.answered_calls) {
        return acc + (campaign.average_duration * campaign.answered_calls);
      }
      return acc;
    }, 0) || 0;
    
    const avgDuration = answeredCalls > 0 ? totalDuration / answeredCalls : 0;
    
    // Formatar para minutos:segundos
    const minutes = Math.floor(avgDuration / 60);
    const seconds = Math.floor(avgDuration % 60);
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Calcular ligações de hoje
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCalls, error: todayError } = await supabase
      .from('campaign_clients')
      .select('id')
      .gte('call_timestamp', `${today}T00:00:00`);
    
    if (todayError) throw todayError;
    
    const callsToday = todayCalls?.length || 0;
    
    // Taxa de conclusão
    const completionRate = totalCalls > 0 ? 
      `${Math.round((answeredCalls / totalCalls) * 100)}%` : '0%';
    
    return {
      recentCalls: answeredCalls,
      avgCallDuration: formattedDuration,
      callsToday,
      completionRate
    };
  }
};
