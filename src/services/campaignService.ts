import { supabase } from '@/lib/supabase';

export const campaignService = {
  // Buscar todas as campanhas
  async getCampaigns() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Buscar apenas campanhas ativas
  async getActiveCampaigns() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Obter estatísticas das campanhas
  async getCampaignStats() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Total de ligações nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentCalls, error: recentCallsError } = await supabase
      .from('calls')
      .select('duration, call_start, call_end')
      .gt('call_start', sevenDaysAgo.toISOString());
    
    if (recentCallsError) throw recentCallsError;
    
    // Ligações de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayCalls, error: todayCallsError } = await supabase
      .from('calls')
      .select('*')
      .gt('call_start', today.toISOString());
    
    if (todayCallsError) throw todayCallsError;
    
    // Calcular duração média
    let totalDuration = 0;
    let callCount = 0;
    
    recentCalls?.forEach(call => {
      if (call.duration) {
        totalDuration += call.duration;
        callCount++;
      }
    });
    
    const avgDuration = callCount > 0 ? totalDuration / callCount : 0;
    const minutes = Math.floor(avgDuration / 60);
    const seconds = Math.floor(avgDuration % 60);
    
    // Taxa de conclusão (chamadas atendidas / total de chamadas)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('total_calls, answered_calls')
      .eq('user_id', userId);
    
    if (campaignsError) throw campaignsError;
    
    let totalCalls = 0;
    let answeredCalls = 0;
    
    campaigns?.forEach(campaign => {
      totalCalls += campaign.total_calls || 0;
      answeredCalls += campaign.answered_calls || 0;
    });
    
    const completionRate = totalCalls > 0 
      ? Math.round((answeredCalls / totalCalls) * 100) 
      : 0;
    
    return {
      recentCalls: recentCalls?.length || 0,
      avgCallDuration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      callsToday: todayCalls?.length || 0,
      completionRate: `${completionRate}%`
    };
  },
  
  // Buscar uma campanha por ID
  async getCampaignById(id: number) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // Criar nova campanha
  async createCampaign(campaign: any) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Ensure status is one of the allowed values (fix for database constraint)
    if (!campaign.status || !['active', 'pending', 'completed', 'stopped'].includes(campaign.status)) {
      campaign.status = 'pending'; // Default to pending if status is not valid
    }

    console.log('Creating campaign with data:', { ...campaign, user_id: userId });
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert([{ ...campaign, user_id: userId }])
      .select();
    
    if (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
    
    console.log('Campaign created successfully:', data[0]);
    return data[0];
  },
  
  // Adicionar clientes a uma campanha
  async addClientsToCampaign(campaignId: number, clients: any[]) {
    console.log(`Adding ${clients.length} clients to campaign ${campaignId}`);
    
    // Validate input
    if (!campaignId || !clients || clients.length === 0) {
      console.error('Invalid input for addClientsToCampaign');
      return null;
    }
    
    try {
      // Preparar array de objetos para inserir na tabela campaign_clients
      const campaignClients = clients.map(client => ({
        campaign_id: campaignId,
        client_id: client.id,
        status: 'pending'
      }));
      
      console.log('Prepared campaign client records:', campaignClients.length);
      
      const { data, error } = await supabase
        .from('campaign_clients')
        .insert(campaignClients)
        .select();
      
      if (error) {
        console.error('Error adding clients to campaign:', error);
        throw error;
      }
      
      // Atualizar o total de chamadas na campanha
      const updateResult = await supabase
        .from('campaigns')
        .update({ total_calls: clients.length })
        .eq('id', campaignId)
        .select();
        
      if (updateResult.error) {
        console.error('Error updating campaign total_calls:', updateResult.error);
      } else {
        console.log('Updated campaign total_calls:', clients.length);
      }
      
      return data;
    } catch (error) {
      console.error('Error in addClientsToCampaign:', error);
      throw error;
    }
  },
  
  // Atualizar uma campanha
  async updateCampaign(id: number, updates: any) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  // Processar dados de ligações por campanha para exibição
  processCallsDataByCampaign(callsData: any[]) {
    const campaignMap = new Map();
    
    callsData.forEach(call => {
      if (!call.campaign_id) return;
      
      if (!campaignMap.has(call.campaign_id)) {
        campaignMap.set(call.campaign_id, {
          campaignId: call.campaign_id,
          campaignName: call.campaign_name || `Campanha ${call.campaign_id}`,
          totalCalls: 0,
          answeredCalls: 0,
          totalDuration: 0,
          avgDuration: 0
        });
      }
      
      const campaignStats = campaignMap.get(call.campaign_id);
      campaignStats.totalCalls++;
      
      if (call.status === 'completed' || call.status === 'answered') {
        campaignStats.answeredCalls++;
        if (call.duration) {
          campaignStats.totalDuration += call.duration;
        }
      }
    });
    
    // Calcular média de duração para cada campanha
    campaignMap.forEach(campaign => {
      if (campaign.answeredCalls > 0) {
        campaign.avgDuration = campaign.totalDuration / campaign.answeredCalls;
      }
    });
    
    return Array.from(campaignMap.values());
  }
};
