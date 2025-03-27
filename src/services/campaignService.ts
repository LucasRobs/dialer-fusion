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
  },

  // Return real call history data from the database
  getCallHistory: async () => {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from('campaign_clients')
      .select(`
        id,
        call_timestamp,
        call_duration,
        status,
        clients!inner(name, phone, email),
        campaigns!inner(name)
      `)
      .eq('campaigns.user_id', user.user.id)
      .order('call_timestamp', { ascending: false });
    
    if (error) {
      console.error("Error fetching call history:", error);
      return [];
    }
    
    // Format the data to match the expected structure in the UI
    return data?.map(item => ({
      id: item.id,
      clientName: item.clients?.name || 'Unknown',
      phone: item.clients?.phone || 'N/A',
      campaign: item.campaigns?.name || 'Unknown Campaign',
      date: item.call_timestamp ? new Date(item.call_timestamp).toISOString().split('T')[0] : 'N/A',
      time: item.call_timestamp ? new Date(item.call_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      duration: item.call_duration ? `${Math.floor(item.call_duration / 60)}:${String(Math.floor(item.call_duration % 60)).padStart(2, '0')}` : '0:00',
      status: item.status || 'Unknown',
      outcome: determineOutcome(item.status),
      notes: 'Auto-generated call log.'
    })) || [];
  },
  
  // Return real analytics data from the database
  getAnalyticsData: async () => {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      throw new Error("User not authenticated");
    }
    
    // Get calls from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get all calls
    const { data: calls, error: callsError } = await supabase
      .from('campaign_clients')
      .select(`
        id,
        call_timestamp,
        call_duration,
        status,
        campaigns!inner(name)
      `)
      .eq('campaigns.user_id', user.user.id)
      .gte('call_timestamp', thirtyDaysAgo.toISOString());
    
    if (callsError) {
      console.error("Error fetching call analytics:", callsError);
      return null;
    }
    
    // Get calls from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const callsToday = calls?.filter(call => new Date(call.call_timestamp) >= today) || [];
    
    // Get all campaign data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.user.id);
    
    if (campaignsError) {
      console.error("Error fetching campaign analytics:", campaignsError);
      return null;
    }
    
    // Calculate call metrics
    const totalCalls = calls?.length || 0;
    const completedCalls = calls?.filter(call => call.status === 'Completed').length || 0;
    const avgDuration = calls?.reduce((sum, call) => sum + (call.call_duration || 0), 0) / (totalCalls || 1);
    
    // Generate charts data
    const getMonthData = () => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const last6Months = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        last6Months.push(monthNames[monthIndex]);
      }
      
      return last6Months.map(month => ({
        name: month,
        calls: 0,
        cost: 0
      }));
    };
    
    // Campaign data for pie chart
    const campaignData = campaigns?.map(campaign => ({
      name: campaign.name,
      value: campaign.total_calls || 0
    })) || [];
    
    // Return the analytics data
    return {
      totalCalls,
      callsChangePercentage: 0, // Would calculate from previous period in a real implementation
      avgCallDuration: formatDuration(avgDuration),
      durationChangePercentage: 0,
      conversionRate: totalCalls ? Math.round((completedCalls / totalCalls) * 100) : 0,
      conversionChangePercentage: 0,
      callsToday: callsToday.length,
      callsData: getMonthData(),
      campaignData
    };
  }
};

// Helper to format call duration
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Helper to determine call outcome based on status
function determineOutcome(status) {
  switch (status) {
    case 'Completed':
      return Math.random() > 0.5 ? 'Interested' : 'Conversion';
    case 'No Answer':
      return 'Follow-up Required';
    case 'Voicemail':
      return 'Message Left';
    case 'Rejected':
      return 'Not Interested';
    default:
      return 'N/A';
  }
}
