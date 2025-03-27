
import { supabase } from '@/lib/supabase';

export type Campaign = {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'stopped';
  start_date?: string;
  end_date?: string;
  created_at?: string;
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
};

export const campaignService = {
  // Buscar todas as campanhas (apenas do usuário atual)
  async getCampaigns() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', session.session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Campaign[];
  },

  // Buscar uma campanha por ID (apenas do usuário atual)
  async getCampaignById(id: number) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.session.user.id)
      .single();
    
    if (error) throw error;
    return data as Campaign;
  },

  // Criar uma nova campanha
  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{
        ...campaign,
        user_id: session.session.user.id
      }])
      .select();
    
    if (error) throw error;
    return data[0] as Campaign;
  },

  // Atualizar uma campanha
  async updateCampaign(id: number, campaign: Partial<Campaign>) {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('campaigns')
      .update(campaign)
      .eq('id', id)
      .eq('user_id', session.session.user.id)
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
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      throw new Error('User not authenticated');
    }
    
    // Primeiro verificar se a campanha pertence ao usuário
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', session.session.user.id)
      .single();
      
    if (campaignError) throw campaignError;
    
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
  }
};
