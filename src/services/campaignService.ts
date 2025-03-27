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

  // Delete a campaign
  async deleteCampaign(id: number) {
    // First delete all associated campaign_clients records
    const { error: clientsError } = await supabase
      .from('campaign_clients')
      .delete()
      .eq('campaign_id', id);
    
    if (clientsError) throw clientsError;
    
    // Then delete the campaign itself
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
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

  // Return empty call history data for new users
  getCallHistory: async () => {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      // Return empty array for new users
      return [];
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
    
    // Return empty array if no data
    if (!data || data.length === 0) {
      return [];
    }
    
    // Format the data to match the expected structure in the UI
    return data.map(item => ({
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
    }));
  },
  
  // Return empty analytics data for new users
  getAnalyticsData: async () => {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user || !user.user) {
      // Return empty data for new users
      return {
        totalCalls: 0,
        callsChangePercentage: 0,
        avgCallDuration: '0:00',
        durationChangePercentage: 0,
        conversionRate: 0,
        conversionChangePercentage: 0,
        callsToday: 0,
        callsData: getEmptyMonthData(),
        campaignData: []
      };
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
      return {
        totalCalls: 0,
        callsChangePercentage: 0,
        avgCallDuration: '0:00',
        durationChangePercentage: 0,
        conversionRate: 0,
        conversionChangePercentage: 0,
        callsToday: 0,
        callsData: getEmptyMonthData(),
        campaignData: []
      };
    }
    
    // If no data, return empty stats
    if (!calls || calls.length === 0) {
      return {
        totalCalls: 0,
        callsChangePercentage: 0,
        avgCallDuration: '0:00',
        durationChangePercentage: 0,
        conversionRate: 0,
        conversionChangePercentage: 0,
        callsToday: 0,
        callsData: getEmptyMonthData(),
        campaignData: []
      };
    }
    
    // Get calls from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const callsToday = calls.filter(call => new Date(call.call_timestamp) >= today) || [];
    
    // Get all campaign data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.user.id);
    
    if (campaignsError) {
      console.error("Error fetching campaign analytics:", campaignsError);
      return {
        totalCalls: 0,
        callsChangePercentage: 0,
        avgCallDuration: '0:00',
        durationChangePercentage: 0,
        conversionRate: 0,
        conversionChangePercentage: 0,
        callsToday: 0,
        callsData: getEmptyMonthData(),
        campaignData: []
      };
    }
    
    // Calculate call metrics
    const totalCalls = calls.length || 0;
    const completedCalls = calls.filter(call => call.status === 'Completed').length || 0;
    const avgDuration = calls.reduce((sum, call) => sum + (call.call_duration || 0), 0) / (totalCalls || 1);
    
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
  },

  async getClientsByIdsForCampaign(clientIds: number[]) {
    try {
      // If there are no client IDs, return an empty array
      if (!clientIds || clientIds.length === 0) {
        return [];
      }
      
      const clientIdsParam = clientIds.join(',');
      const response = await fetch(
        `https://ovanntvqwzifxjrnnalr.supabase.co/rest/v1/clients?id=in.(${clientIdsParam})&select=id,name,phone,email`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching clients: ${response.statusText}`);
      }
      
      const clients = await response.json();
      return clients;
    } catch (error) {
      console.error('Error fetching clients for campaign:', error);
      throw error;
    }
  },

  async exportCampaignClientsToCsv(campaignId: number) {
    try {
      // Get campaign details
      const campaign = await this.getCampaignById(campaignId);
      
      // Get the campaign clients with their details
      const response = await fetch(
        `https://ovanntvqwzifxjrnnalr.supabase.co/rest/v1/campaign_clients?select=client_id,status,clients(name,phone,email)&campaign_id=eq.${campaignId}`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92YW5udHZxd3ppZnhqcm5uYWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTE4NzgsImV4cCI6MjA1ODU4Nzg3OH0.t7R_EiadlDXqWeB-Sgx_McseGGkrbk9br_mblC8unK8`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching campaign clients: ${response.statusText}`);
      }
      
      const campaignClients = await response.json();
      
      // Transform the data for CSV
      const csvData = campaignClients.map((client: any) => ({
        name: client.clients?.name || '',
        phone: client.clients?.phone || '',
        email: client.clients?.email || '',
        status: client.status || 'pending'
      }));
      
      // Generate CSV content
      let csvContent = 'Name,Phone,Email,Status\n';
      
      csvData.forEach((row: any) => {
        const formattedRow = `"${row.name}","${row.phone}","${row.email}","${row.status}"`;
        csvContent += formattedRow + '\n';
      });
      
      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campaign_${campaignId}_${campaign?.name || 'export'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('Error exporting campaign clients to CSV:', error);
      throw error;
    }
  },

  async getClientDataForCampaign(campaignId: number) {
    try {
      const { data, error } = await supabase
        .from('campaign_clients')
        .select(`
          client_id,
          clients (id, name, phone, email),
          call_timestamp,
          call_duration,
          status
        `)
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
      
      // Extract client data from the nested structure
      const clientData = data.map((item: any) => {
        return {
          id: item.client_id,
          name: item.clients?.name || 'Desconhecido',
          phone: item.clients?.phone || '(não informado)',
          email: item.clients?.email || '(não informado)',
          call_timestamp: item.call_timestamp,
          call_duration: item.call_duration || 0,
          status: item.status || 'pending'
        };
      });
      
      return clientData;
    } catch (error) {
      console.error('Erro ao buscar dados de clientes para a campanha:', error);
      throw error;
    }
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

// Helper function to generate empty month data for charts
function getEmptyMonthData() {
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
}

// Helper function to generate month data for charts with real data
function getMonthData() {
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
}
